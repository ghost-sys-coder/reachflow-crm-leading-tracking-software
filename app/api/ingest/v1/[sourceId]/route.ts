import { decryptSecret } from "@/lib/webhooks/security"
import { verifyInboundSignature } from "@/lib/ingestion/security"
import { processIngestionEvent } from "@/lib/ingestion/process"
import { createAdminClient } from "@/lib/supabase/admin"

const MAX_BODY_BYTES = 64 * 1024

export async function POST(request: Request, { params }: { params: Promise<{ sourceId: string }> }) {
  const { sourceId } = await params
  const declaredLength = Number(request.headers.get("content-length") ?? 0)
  if (declaredLength > MAX_BODY_BYTES) return Response.json({ error: "Payload too large" }, { status: 413 })
  const body = await request.text()
  if (Buffer.byteLength(body, "utf8") > MAX_BODY_BYTES) return Response.json({ error: "Payload too large" }, { status: 413 })

  const db = createAdminClient()
  const { data: source } = await db.from("lead_sources").select("id,org_id,is_active,secret_ciphertext,previous_secret_ciphertext,previous_secret_expires_at").eq("id", sourceId).eq("source_type", "inbound_webhook").maybeSingle()
  if (!source?.is_active || !source.secret_ciphertext) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const timestamp = request.headers.get("x-reachflow-timestamp")
  const signature = request.headers.get("x-reachflow-signature")
  const currentValid = verifyInboundSignature(decryptSecret(source.secret_ciphertext), timestamp, signature, body)
  const previousValid = Boolean(source.previous_secret_ciphertext && source.previous_secret_expires_at && new Date(source.previous_secret_expires_at) > new Date() && verifyInboundSignature(decryptSecret(source.previous_secret_ciphertext), timestamp, signature, body))
  const valid = currentValid || previousValid
  if (!valid) return Response.json({ error: "Unauthorized" }, { status: 401 })

  let payload: Record<string, unknown>
  try {
    const parsed = JSON.parse(body)
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error()
    payload = parsed
  } catch {
    return Response.json({ error: "Request body must be a JSON object" }, { status: 400 })
  }

  const externalEventId = String(request.headers.get("x-reachflow-event-id") ?? payload.external_event_id ?? "").trim()
  if (!externalEventId || externalEventId.length > 200) return Response.json({ error: "x-reachflow-event-id is required and must be 200 characters or fewer" }, { status: 400 })

  const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString()
  const { count } = await db.from("ingestion_events").select("id", { count: "exact", head: true }).eq("source_id", source.id).gte("received_at", oneMinuteAgo)
  if ((count ?? 0) >= 120) return Response.json({ error: "Rate limit exceeded" }, { status: 429, headers: { "Retry-After": "60" } })

  const { data: event, error } = await db.from("ingestion_events").insert({ org_id: source.org_id, source_id: source.id, external_event_id: externalEventId, raw_payload: payload }).select("id").maybeSingle()
  if (error || !event) {
    const { data: existing } = await db.from("ingestion_events").select("id,status,prospect_id,outcome,error_message").eq("source_id", source.id).eq("external_event_id", externalEventId).maybeSingle()
    if (existing) return Response.json({ duplicate: true, event: existing }, { status: 200 })
    return Response.json({ error: "Could not accept lead" }, { status: 500 })
  }

  const result = await processIngestionEvent(event.id)
  return Response.json({ duplicate: false, event: result }, { status: result.status === "failed" ? 422 : 201 })
}
