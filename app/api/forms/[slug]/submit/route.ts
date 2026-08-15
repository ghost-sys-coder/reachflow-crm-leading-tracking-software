import { createHash, randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { processIngestionEvent } from "@/lib/ingestion/process";
import type { HostedFormField } from "@/lib/forms/fields";

const clean = (value: unknown, max = 500) => String(value ?? "").trim().slice(0, max);

export async function POST(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const db = createAdminClient();
  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ message: "The submission could not be read" }, { status: 400 });
  }
  if (clean(payload.company_website)) return NextResponse.json({ message: "Submission received" });

  const { data: form } = await db.from("hosted_forms")
    .select("id,org_id,source_id,status,fields,require_consent,consent_text,success_message,redirect_url")
    .eq("slug", slug).eq("status", "active").maybeSingle();
  if (!form) return NextResponse.json({ message: "This form is not accepting submissions" }, { status: 404 });

  const fields = (form.fields ?? []) as HostedFormField[];
  const values: Record<string, string> = {};
  for (const field of fields) {
    const value = clean(payload[field.name], field.name === "notes" ? 2000 : 300);
    if (field.required && !value) return NextResponse.json({ message: `${field.label} is required` }, { status: 422 });
    if (value) values[field.name] = value;
  }
  if (!values.business_name) return NextResponse.json({ message: "Business name is required" }, { status: 422 });
  const consentGiven = payload.consent === true;
  if (form.require_consent && !consentGiven) return NextResponse.json({ message: "Please provide consent before submitting" }, { status: 422 });

  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const fingerprint = createHash("sha256").update(`${form.id}:${forwarded}:${process.env.WEBHOOK_ENCRYPTION_KEY ?? "reachflow-form"}`).digest("hex");
  const minuteAgo = new Date(Date.now() - 60_000).toISOString();
  const { count } = await db.from("form_submissions").select("id", { count: "exact", head: true })
    .eq("form_id", form.id).eq("ip_hash", fingerprint).gte("submitted_at", minuteAgo);
  if ((count ?? 0) >= 5) return NextResponse.json({ message: "Too many submissions. Please wait a minute and try again." }, { status: 429 });

  const externalId = `form:${form.id}:${randomUUID()}`;
  const { data: event, error: eventError } = await db.from("ingestion_events").insert({
    org_id: form.org_id,
    source_id: form.source_id,
    external_event_id: externalId,
    raw_payload: values,
  }).select("id").single();
  if (eventError || !event) return NextResponse.json({ message: "Your details could not be submitted" }, { status: 500 });

  const { error: submissionError } = await db.from("form_submissions").insert({
    org_id: form.org_id,
    form_id: form.id,
    ingestion_event_id: event.id,
    consent_given: consentGiven,
    consent_text: consentGiven ? form.consent_text : null,
    ip_hash: fingerprint,
    user_agent: clean(request.headers.get("user-agent"), 500) || null,
    referrer: clean(request.headers.get("referer"), 500) || null,
  });
  if (submissionError) return NextResponse.json({ message: "Your details could not be submitted" }, { status: 500 });

  const result = await processIngestionEvent(event.id);
  if (result.status === "failed") return NextResponse.json({ message: "We received your details but could not process them. Please try again." }, { status: 500 });
  if (consentGiven && result.prospectId) await db.from("consent_records").insert({
    org_id: form.org_id,
    prospect_id: result.prospectId,
    status: "granted",
    purpose: "outreach",
    source: "hosted_form",
    evidence: `${form.consent_text} [submission ${event.id}]`,
  });
  return NextResponse.json({ message: form.success_message, redirectUrl: form.redirect_url }, { status: 201 });
}
