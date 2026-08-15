import { createAdminClient } from "@/lib/supabase/admin";
import type { OrgContext } from "@/lib/auth/org";
import { runProspectCreatedLifecycle } from "@/lib/prospects/created-lifecycle";

const TARGET_FIELDS = [
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
] as const;
const PLATFORMS = new Set([
  "instagram",
  "email",
  "facebook",
  "linkedin",
  "x",
  "call",
  "other",
]);
const STATUSES = new Set([
  "sent",
  "waiting",
  "replied",
  "booked",
  "closed",
  "dead",
]);

type JsonObject = Record<string, unknown>;
type LeadSource = {
  id: string;
  org_id: string;
  name: string;
  field_mappings: JsonObject | null;
  default_values: JsonObject | null;
  created_by: string | null;
  failure_count: number;
};

function getPath(payload: JsonObject, path: string) {
  return path
    .split(".")
    .reduce<unknown>(
      (value, key) =>
        value && typeof value === "object"
          ? (value as JsonObject)[key]
          : undefined,
      payload,
    );
}

function clean(value: unknown) {
  if (value === null || value === undefined) return null;
  const result = String(value).trim();
  return result || null;
}

function normalizeWebsite(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(
      /^https?:\/\//i.test(value) ? value : `https://${value}`,
    );
    url.hash = "";
    url.search = "";
    return url.toString().replace(/\/$/, "").toLowerCase();
  } catch {
    return value.toLowerCase().replace(/\/$/, "");
  }
}

export function normalizeInboundLead(source: LeadSource, payload: JsonObject) {
  const mappings = source.field_mappings ?? {};
  const defaults = source.default_values ?? {};
  const normalized: JsonObject = {};

  for (const field of TARGET_FIELDS) {
    const sourcePath = clean(mappings[field]) ?? field;
    const mappedValue = clean(getPath(payload, sourcePath));
    const canonicalValue = sourcePath === field ? null : clean(payload[field]);
    normalized[field] = mappedValue ?? canonicalValue ?? clean(defaults[field]);
  }

  const platformAlias: Record<string, string> = {
    twitter: "x",
    phone: "call",
    telephone: "call",
  };
  const rawPlatform = clean(normalized.platform)?.toLowerCase() ?? "other";
  normalized.platform = platformAlias[rawPlatform] ?? rawPlatform;
  normalized.status = clean(normalized.status)?.toLowerCase() ?? "sent";
  normalized.handle =
    clean(normalized.handle)?.toLowerCase().replace(/^@/, "") ?? null;
  normalized.phone_number =
    clean(normalized.phone_number)?.replace(/[\s()-]/g, "") ?? null;
  normalized.website_url = normalizeWebsite(clean(normalized.website_url));

  if (!clean(normalized.business_name))
    throw new Error("business_name is required after applying field mappings");
  if (!PLATFORMS.has(String(normalized.platform)))
    throw new Error(`Unsupported platform: ${normalized.platform}`);
  if (!STATUSES.has(String(normalized.status)))
    throw new Error(`Unsupported status: ${normalized.status}`);

  return normalized as Record<(typeof TARGET_FIELDS)[number], string | null>;
}

async function findMatch(
  db: ReturnType<typeof createAdminClient>,
  orgId: string,
  lead: ReturnType<typeof normalizeInboundLead>,
) {
  if (lead.handle) {
    const { data } = await db
      .from("prospects")
      .select("*")
      .eq("org_id", orgId)
      .eq("platform", lead.platform)
      .ilike("handle", lead.handle)
      .limit(1)
      .maybeSingle();
    if (data) return { prospect: data, matchedOn: "platform_handle" };
  }
  if (lead.phone_number) {
    const { data } = await db
      .from("prospects")
      .select("*")
      .eq("org_id", orgId)
      .eq("phone_number", lead.phone_number)
      .limit(1)
      .maybeSingle();
    if (data) return { prospect: data, matchedOn: "phone_number" };
  }
  if (lead.website_url) {
    const { data } = await db
      .from("prospects")
      .select("*")
      .eq("org_id", orgId)
      .eq("website_url", lead.website_url)
      .limit(1)
      .maybeSingle();
    if (data) return { prospect: data, matchedOn: "website_url" };
  }
  return null;
}

export async function processIngestionEvent(eventId: string) {
  const db = createAdminClient();
  const { data: event, error: eventError } = await db
    .from("ingestion_events")
    .select("*,lead_sources(*)")
    .eq("id", eventId)
    .single();
  if (eventError || !event)
    throw new Error(eventError?.message ?? "Ingestion event not found");
  const source = event.lead_sources as LeadSource;

  await db
    .from("ingestion_events")
    .update({
      status: "processing",
      attempt_count: event.attempt_count + 1,
      error_code: null,
      error_message: null,
    })
    .eq("id", eventId);

  try {
    const lead = normalizeInboundLead(source, event.raw_payload as JsonObject);
    let match = await findMatch(db, event.org_id, lead);
    if (!match && event.prospect_id) {
      const { data: eventProspect } = await db.from("prospects").select("*").eq("id", event.prospect_id).eq("org_id", event.org_id).maybeSingle();
      if (eventProspect) match = { prospect: eventProspect, matchedOn: "ingestion_event" };
    }
    let prospectId: string;
    let status: "created" | "matched";
    let outcome: string;

    const previouslyCreatedByThisEvent = Boolean(match && event.prospect_id === match.prospect.id && event.outcome === "Created a new prospect");
    if (match) {
      prospectId = match.prospect.id;
      status = previouslyCreatedByThisEvent ? "created" : "matched";
      outcome = previouslyCreatedByThisEvent ? "Created a new prospect" : `Matched existing prospect by ${match.matchedOn}`;
      const enrichment = Object.fromEntries(
        TARGET_FIELDS.filter(
          (field) =>
            field !== "business_name" && !match.prospect[field] && lead[field],
        ).map((field) => [field, lead[field]]),
      );
      if (Object.keys(enrichment).length)
        await db
          .from("prospects")
          .update({ ...enrichment, updated_at: new Date().toISOString() })
          .eq("id", prospectId)
          .eq("org_id", event.org_id);
    } else {
      const { data: prospect, error } = await db
        .from("prospects")
        .insert({
          ...lead,
          org_id: event.org_id,
          assigned_to: clean(source.default_values?.assigned_to),
        })
        .select("id")
        .single();
      if (error || !prospect)
        throw new Error(error?.message ?? "Could not create prospect");
      prospectId = prospect.id;
      status = "created";
      outcome = "Created a new prospect";
      await db.from("ingestion_events").update({ prospect_id: prospectId, normalized_payload: lead, outcome }).eq("id", eventId);
    }

    const campaignId = clean(source.default_values?.campaign_id);
    if (campaignId) {
      const { data: campaign } = await db
        .from("campaigns")
        .select("id,name")
        .eq("id", campaignId)
        .eq("org_id", event.org_id)
        .maybeSingle();
      if (campaign)
        await db
          .from("campaign_prospects")
          .upsert(
            {
              campaign_id: campaign.id,
              prospect_id: prospectId,
              added_by: source.created_by,
            },
            { onConflict: "campaign_id,prospect_id" },
          );
    }

    const tagId = clean(source.default_values?.tag_id);
    if (tagId) {
      const { data: tag } = await db
        .from("tags")
        .select("id")
        .eq("id", tagId)
        .eq("org_id", event.org_id)
        .maybeSingle();
      if (tag)
        await db
          .from("prospect_tags")
          .upsert(
            { prospect_id: prospectId, tag_id: tag.id },
            { onConflict: "prospect_id,tag_id" },
          );
    }

    await db
      .from("prospect_attributions")
      .insert({
        org_id: event.org_id,
        prospect_id: prospectId,
        source_id: source.id,
        provider: "inbound_webhook",
        source_name: source.name,
        external_id: event.external_event_id,
        is_original: status === "created",
        created_by: source.created_by,
      });

    if (status === "created") {
      let actorId = source.created_by;
      if (!actorId) {
        const { data: membership } = await db.from("organization_members").select("user_id").eq("org_id", event.org_id).eq("role", "admin").order("created_at").limit(1).maybeSingle();
        actorId = membership?.user_id ?? null;
      }
      if (!actorId) throw new Error("No workspace administrator is available to run prospect-created lifecycle actions");
      const { data: createdProspect, error: prospectError } = await db.from("prospects").select("id,business_name,platform,status,industry,location,state,country").eq("id", prospectId).eq("org_id", event.org_id).single();
      if (prospectError || !createdProspect) throw new Error(prospectError?.message ?? "Created prospect could not be reloaded");
      const lifecycleContext: OrgContext = { supabase: db as unknown as OrgContext["supabase"], userId: actorId, orgId: event.org_id, role: "admin" };
      await runProspectCreatedLifecycle(lifecycleContext, createdProspect);
    }
    const now = new Date().toISOString();
    await Promise.all([
      db
        .from("ingestion_events")
        .update({
          status,
          outcome,
          prospect_id: prospectId,
          normalized_payload: lead,
          processed_at: now,
        })
        .eq("id", eventId),
      db
        .from("lead_sources")
        .update({
          last_success_at: now,
          last_received_at: event.received_at,
          failure_count: 0,
          updated_at: now,
        })
        .eq("id", source.id),
    ]);
    return { eventId, status, prospectId, outcome };
  } catch (cause) {
    const message =
      cause instanceof Error ? cause.message : "Lead processing failed";
    const now = new Date().toISOString();
    await Promise.all([
      db
        .from("ingestion_events")
        .update({
          status: "failed",
          error_code: "processing_failed",
          error_message: message.slice(0, 500),
          processed_at: now,
        })
        .eq("id", eventId),
      db
        .from("lead_sources")
        .update({
          last_failure_at: now,
          last_received_at: event.received_at,
          failure_count: (source.failure_count ?? 0) + 1,
          updated_at: now,
        })
        .eq("id", source.id),
    ]);
    return {
      eventId,
      status: "failed" as const,
      prospectId: null,
      outcome: message,
    };
  }
}
