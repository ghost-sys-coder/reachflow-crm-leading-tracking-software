"use server";

import { randomBytes, randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { getAuthedOrgClient } from "@/lib/auth/org";
import { createAdminClient } from "@/lib/supabase/admin";
import { encryptSecret } from "@/lib/webhooks/security";
import { processIngestionEvent } from "@/lib/ingestion/process";

export type LeadSourceActionState = {
  success: boolean;
  message: string;
  secret?: string;
  sourceId?: string;
};
const fail = (message: string): LeadSourceActionState => ({
  success: false,
  message,
});

function adminOnly(role: string) {
  return role === "admin"
    ? null
    : "Only workspace administrators can manage lead sources";
}

function mappingFrom(form: FormData) {
  const fields = [
    "business_name",
    "platform",
    "handle",
    "phone_number",
    "industry",
    "location",
    "state",
    "country",
    "website_url",
    "status",
    "notes",
  ];
  const mappings = Object.fromEntries(
    fields.map((field) => [
      field,
      String(form.get(`map_${field}`) ?? field).trim() || field,
    ]),
  );
  const invalid = Object.entries(mappings).find(
    ([, path]) =>
      !/^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*)*$/.test(path),
  );
  if (invalid)
    throw new Error(
      `Mapping for ${invalid[0].replaceAll("_", " ")} must be a JSON path such as ${invalid[0]} or lead.${invalid[0]}. Do not enter prospect information in mapping fields.`,
    );
  return mappings;
}

function defaultsFrom(form: FormData) {
  return Object.fromEntries(
    ["platform", "status", "campaign_id", "tag_id", "assigned_to"]
      .map((field) => [
        field,
        String(form.get(`default_${field}`) ?? "").trim(),
      ])
      .filter(([, value]) => value),
  );
}

export async function createLeadSource(
  _previous: LeadSourceActionState,
  form: FormData,
): Promise<LeadSourceActionState> {
  const { ctx, error } = await getAuthedOrgClient();
  if (!ctx) return fail(error);
  const denied = adminOnly(ctx.role);
  if (denied) return fail(denied);
  if (!process.env.WEBHOOK_ENCRYPTION_KEY)
    return fail("WEBHOOK_ENCRYPTION_KEY is required");
  const name = String(form.get("name") ?? "").trim();
  if (!name || name.length > 100)
    return fail("Source name is required and must be 100 characters or fewer");
  let fieldMappings: Record<string, string>;
  try {
    fieldMappings = mappingFrom(form);
  } catch (cause) {
    return fail(
      cause instanceof Error ? cause.message : "Invalid field mapping",
    );
  }
  const secret = randomBytes(32).toString("hex");
  const { data, error: insertError } = await ctx.supabase
    .from("lead_sources")
    .insert({
      org_id: ctx.orgId,
      name,
      source_type: "inbound_webhook",
      secret_ciphertext: encryptSecret(secret),
      secret_last_four: secret.slice(-4),
      field_mappings: fieldMappings,
      default_values: defaultsFrom(form),
      created_by: ctx.userId,
    })
    .select("id")
    .single();
  if (insertError || !data)
    return fail(
      `Could not create source: ${insertError?.message ?? "Unknown error"}`,
    );
  revalidatePath("/lead-sources");
  return {
    success: true,
    message: `${name} created. Copy the secret now; it will not be shown again.`,
    secret,
    sourceId: data.id,
  };
}

export async function toggleLeadSource(
  _previous: LeadSourceActionState,
  form: FormData,
): Promise<LeadSourceActionState> {
  const { ctx, error } = await getAuthedOrgClient();
  if (!ctx) return fail(error);
  const denied = adminOnly(ctx.role);
  if (denied) return fail(denied);
  const active = form.get("active") === "true";
  const { error: updateError } = await ctx.supabase
    .from("lead_sources")
    .update({ is_active: active, updated_at: new Date().toISOString() })
    .eq("id", String(form.get("id")))
    .eq("org_id", ctx.orgId)
    .eq("source_type", "inbound_webhook");
  if (updateError) return fail(updateError.message);
  revalidatePath("/lead-sources");
  return {
    success: true,
    message: active ? "Lead source enabled" : "Lead source disabled",
  };
}

export async function resetLeadSourceMappings(
  _previous: LeadSourceActionState,
  form: FormData,
): Promise<LeadSourceActionState> {
  const { ctx, error } = await getAuthedOrgClient();
  if (!ctx) return fail(error);
  const denied = adminOnly(ctx.role);
  if (denied) return fail(denied);
  const canonical = Object.fromEntries(
    [
      "business_name",
      "platform",
      "handle",
      "phone_number",
      "industry",
      "location",
      "state",
      "country",
      "website_url",
      "status",
      "notes",
    ].map((field) => [field, field]),
  );
  const { error: updateError } = await ctx.supabase
    .from("lead_sources")
    .update({ field_mappings: canonical, updated_at: new Date().toISOString() })
    .eq("id", String(form.get("id")))
    .eq("org_id", ctx.orgId)
    .eq("source_type", "inbound_webhook");
  if (updateError) return fail(updateError.message);
  revalidatePath("/lead-sources");
  return {
    success: true,
    message: "Field mappings reset to standard ReachFlow JSON keys",
  };
}

export async function rotateLeadSourceSecret(
  _previous: LeadSourceActionState,
  form: FormData,
): Promise<LeadSourceActionState> {
  const { ctx, error } = await getAuthedOrgClient();
  if (!ctx) return fail(error);
  const denied = adminOnly(ctx.role);
  if (denied) return fail(denied);
  const id = String(form.get("id"));
  const { data: source } = await ctx.supabase
    .from("lead_sources")
    .select("secret_ciphertext")
    .eq("id", id)
    .eq("org_id", ctx.orgId)
    .eq("source_type", "inbound_webhook")
    .maybeSingle();
  if (!source?.secret_ciphertext) return fail("Lead source not found");
  const secret = randomBytes(32).toString("hex");
  const { error: updateError } = await ctx.supabase
    .from("lead_sources")
    .update({
      previous_secret_ciphertext: source.secret_ciphertext,
      previous_secret_expires_at: new Date(
        Date.now() + 24 * 3600_000,
      ).toISOString(),
      secret_ciphertext: encryptSecret(secret),
      secret_last_four: secret.slice(-4),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("org_id", ctx.orgId);
  if (updateError) return fail(updateError.message);
  revalidatePath("/lead-sources");
  return {
    success: true,
    message: "Secret rotated. The previous secret remains valid for 24 hours.",
    secret,
    sourceId: id,
  };
}

export async function deleteLeadSource(
  _previous: LeadSourceActionState,
  form: FormData,
): Promise<LeadSourceActionState> {
  const { ctx, error } = await getAuthedOrgClient();
  if (!ctx) return fail(error);
  const denied = adminOnly(ctx.role);
  if (denied) return fail(denied);
  const { data, error: deleteError } = await ctx.supabase
    .from("lead_sources")
    .delete()
    .eq("id", String(form.get("id")))
    .eq("org_id", ctx.orgId)
    .eq("source_type", "inbound_webhook")
    .select("id")
    .maybeSingle();
  if (deleteError) return fail(deleteError.message);
  if (!data) return fail("Lead source not found");
  revalidatePath("/lead-sources");
  return {
    success: true,
    message: "Lead source and its ingestion history deleted",
  };
}

export async function testLeadSource(
  _previous: LeadSourceActionState,
  form: FormData,
): Promise<LeadSourceActionState> {
  const { ctx, error } = await getAuthedOrgClient();
  if (!ctx) return fail(error);
  const denied = adminOnly(ctx.role);
  if (denied) return fail(denied);
  const id = String(form.get("id"));
  let payload: Record<string, unknown>;
  try {
    const parsed = JSON.parse(String(form.get("payload") ?? ""));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      throw new Error();
    payload = parsed;
  } catch {
    return fail("Test payload must be a valid JSON object");
  }
  const { data: source } = await ctx.supabase
    .from("lead_sources")
    .select("id")
    .eq("id", id)
    .eq("org_id", ctx.orgId)
    .eq("source_type", "inbound_webhook")
    .maybeSingle();
  if (!source) return fail("Lead source not found");
  const db = createAdminClient();
  const { data: event, error: insertError } = await db
    .from("ingestion_events")
    .insert({
      org_id: ctx.orgId,
      source_id: id,
      external_event_id: `ui-test:${randomUUID()}`,
      raw_payload: payload,
    })
    .select("id")
    .single();
  if (insertError || !event)
    return fail(insertError?.message ?? "Could not create test event");
  const result = await processIngestionEvent(event.id);
  revalidatePath("/lead-sources");
  return result.status === "failed"
    ? fail(result.outcome)
    : {
        success: true,
        message: `${result.outcome}. Prospect ID: ${result.prospectId}`,
      };
}

export async function replayIngestionEvent(
  _previous: LeadSourceActionState,
  form: FormData,
): Promise<LeadSourceActionState> {
  const { ctx, error } = await getAuthedOrgClient();
  if (!ctx) return fail(error);
  const denied = adminOnly(ctx.role);
  if (denied) return fail(denied);
  const id = String(form.get("event_id"));
  const { data: event } = await ctx.supabase
    .from("ingestion_events")
    .select("id,status")
    .eq("id", id)
    .eq("org_id", ctx.orgId)
    .maybeSingle();
  if (!event || event.status !== "failed")
    return fail("Only failed events can be replayed");
  const result = await processIngestionEvent(id);
  revalidatePath("/lead-sources");
  return result.status === "failed"
    ? fail(result.outcome)
    : {
        success: true,
        message: `${result.outcome}. Prospect ID: ${result.prospectId}`,
      };
}
