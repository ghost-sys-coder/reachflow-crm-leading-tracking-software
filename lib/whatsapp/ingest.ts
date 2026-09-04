import { createAdminClient } from "@/lib/supabase/admin"
import type { WhatsAppWebhookPayload } from "@/lib/whatsapp/webhook"

type Connection = {
  id: string
  org_id: string
  connected_by: string
  phone_number_id: string
}

type IncomingMessage = {
  id?: string
  from?: string
  timestamp?: string
  type?: string
  text?: { body?: string }
}

function normalizePhone(value: string | null | undefined) {
  if (!value) return null
  const digits = value.replace(/\D/g, "").replace(/^00/, "")
  return digits.length >= 8 ? digits : null
}

function messageContent(message: IncomingMessage) {
  if (message.type === "text" && message.text?.body) return message.text.body
  return `[WhatsApp ${message.type ?? "message"}]`
}

export async function ingestWhatsAppWebhook(payload: WhatsAppWebhookPayload) {
  const admin = createAdminClient()
  let processed = 0
  let unmatched = 0

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "messages" || !change.value) continue
      const phoneNumberId = change.value.metadata?.phone_number_id
      if (!phoneNumberId) continue

      const { data: connectionData } = await admin
        .from("whatsapp_connections")
        .select("id,org_id,connected_by,phone_number_id")
        .eq("phone_number_id", phoneNumberId)
        .eq("status", "active")
        .maybeSingle()
      const connection = connectionData as Connection | null

      for (const status of change.value.statuses ?? []) {
        if (!status.id) continue
        await admin.from("whatsapp_webhook_events").upsert({
          connection_id: connection?.id ?? null,
          provider_event_id: status.id,
          event_type: `status:${status.status ?? "unknown"}`,
          payload: status,
          status: connection ? "processed" : "unmatched",
          processed_at: new Date().toISOString(),
        }, { onConflict: "provider_event_id,event_type", ignoreDuplicates: true })

        if (connection && status.status) {
          await admin.from("messages").update({ delivery_status: status.status }).eq("provider", "whatsapp").eq("provider_message_id", status.id).eq("org_id", connection.org_id)
        }
      }

      for (const message of change.value.messages ?? []) {
        if (!message.id) continue
        const sender = normalizePhone(message.from)
        let prospect: { id: string } | null = null

        if (connection && sender) {
          const { data: prospects } = await admin.from("prospects").select("id,phone_number").eq("org_id", connection.org_id).not("phone_number", "is", null)
          prospect = (prospects ?? []).find((candidate) => normalizePhone(candidate.phone_number) === sender) ?? null
        }

        const occurredAt = message.timestamp
          ? new Date(Number(message.timestamp) * 1000).toISOString()
          : new Date().toISOString()
        const eventStatus = connection && prospect ? "processed" : "unmatched"

        await admin.from("whatsapp_webhook_events").upsert({
          connection_id: connection?.id ?? null,
          provider_event_id: message.id,
          event_type: "message",
          payload: message,
          status: eventStatus,
          last_error: connection ? (prospect ? null : `No prospect matches WhatsApp number ${message.from ?? "unknown"}`) : `No active connection for phone number ID ${phoneNumberId}`,
          processed_at: prospect ? new Date().toISOString() : null,
        }, { onConflict: "provider_event_id,event_type", ignoreDuplicates: true })

        if (!connection || !prospect) {
          unmatched += 1
          continue
        }

        const { data: existing } = await admin.from("messages").select("id").eq("provider", "whatsapp").eq("provider_message_id", message.id).maybeSingle()
        if (existing) continue

        const { error: insertError } = await admin.from("messages").insert({
          org_id: connection.org_id,
          prospect_id: prospect.id,
          user_id: connection.connected_by,
          message_type: "whatsapp_message",
          content: messageContent(message),
          direction: "inbound",
          recorded_at: occurredAt,
          was_sent: false,
          provider: "whatsapp",
          provider_message_id: message.id,
          provider_thread_id: sender,
          delivery_status: "received",
          is_read: false,
          synced_at: new Date().toISOString(),
        })

        if (insertError) {
          await admin.from("whatsapp_webhook_events").update({ status: "failed", last_error: insertError.message }).eq("provider_event_id", message.id).eq("event_type", "message")
          throw new Error(insertError.message)
        }

        await admin.from("prospects").update({ status: "replied", last_reply_at: occurredAt }).eq("id", prospect.id).eq("org_id", connection.org_id)
        await admin.from("whatsapp_connections").update({ last_message_at: occurredAt, last_error: null, updated_at: new Date().toISOString() }).eq("id", connection.id)
        processed += 1
      }
    }
  }

  return { processed, unmatched }
}
