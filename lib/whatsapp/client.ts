import { getWhatsAppCloudConfig } from "@/lib/whatsapp/config"

type MetaError = { error?: { message?: string; code?: number } }

async function metaRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const config = getWhatsAppCloudConfig()
  const response = await fetch(`https://graph.facebook.com/${config.graphApiVersion}/${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  })
  const payload = await response.json() as T & MetaError
  if (!response.ok) throw new Error(payload.error?.message ?? `Meta API request failed (${response.status})`)
  return payload
}

export async function subscribeConfiguredWhatsAppAccount() {
  const { businessAccountId } = getWhatsAppCloudConfig()
  return metaRequest<{ success: boolean }>(`${businessAccountId}/subscribed_apps`, { method: "POST" })
}

export async function getConfiguredWhatsAppNumber() {
  const { phoneNumberId } = getWhatsAppCloudConfig()
  return metaRequest<{ id: string; display_phone_number?: string; verified_name?: string }>(`${phoneNumberId}?fields=id,display_phone_number,verified_name`)
}

export async function sendWhatsAppText(to: string, body: string) {
  const { phoneNumberId } = getWhatsAppCloudConfig()
  return metaRequest<{ messages?: Array<{ id: string }> }>(`${phoneNumberId}/messages`, {
    method: "POST",
    body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", to, type: "text", text: { preview_url: false, body } }),
  })
}
