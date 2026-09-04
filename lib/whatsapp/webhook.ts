export type WhatsAppWebhookPayload = {
  object?: string
  entry?: Array<{
    id?: string
    changes?: Array<{
      field?: string
      value?: {
        metadata?: { display_phone_number?: string; phone_number_id?: string }
        contacts?: Array<{ wa_id?: string; profile?: { name?: string } }>
        messages?: Array<{
          id?: string
          from?: string
          timestamp?: string
          type?: string
          text?: { body?: string }
        }>
        statuses?: Array<{
          id?: string
          status?: string
          timestamp?: string
          recipient_id?: string
          errors?: Array<{ code?: number; title?: string; message?: string }>
        }>
      }
    }>
  }>
}

export function isWhatsAppWebhookPayload(value: unknown): value is WhatsAppWebhookPayload {
  if (!value || typeof value !== "object") return false
  const payload = value as WhatsAppWebhookPayload
  return payload.object === "whatsapp_business_account" && Array.isArray(payload.entry)
}
