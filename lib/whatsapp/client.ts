import { getWhatsAppCloudConfig, getWhatsAppEmbeddedSignupConfig } from "@/lib/whatsapp/config"

type MetaError = { error?: { message?: string; code?: number } }

export type WhatsAppApiCredentials = { accessToken: string; phoneNumberId: string; businessAccountId: string }

async function metaRequest<T>(path: string, init?: RequestInit, accessToken?: string): Promise<T> {
  const config = accessToken ? getWhatsAppEmbeddedSignupConfig() : getWhatsAppCloudConfig()
  const response = await fetch(`https://graph.facebook.com/${config.graphApiVersion}/${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken ?? ("accessToken" in config ? config.accessToken : "")}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  })
  const payload = await response.json() as T & MetaError
  if (!response.ok) throw new Error(payload.error?.message ?? `Meta API request failed (${response.status})`)
  return payload
}

export async function subscribeWhatsAppAccount(credentials?: WhatsAppApiCredentials) {
  const config = credentials ?? getWhatsAppCloudConfig()
  return metaRequest<{ success: boolean }>(`${config.businessAccountId}/subscribed_apps`, { method: "POST" }, credentials?.accessToken)
}

export async function getWhatsAppNumber(credentials?: WhatsAppApiCredentials) {
  const config = credentials ?? getWhatsAppCloudConfig()
  return metaRequest<{ id: string; display_phone_number?: string; verified_name?: string }>(`${config.phoneNumberId}?fields=id,display_phone_number,verified_name`, undefined, credentials?.accessToken)
}

export async function getWhatsAppAccountNumbers(credentials: WhatsAppApiCredentials) {
  return metaRequest<{ data?: Array<{ id: string; display_phone_number?: string; verified_name?: string }> }>(
    `${credentials.businessAccountId}/phone_numbers?fields=id,display_phone_number,verified_name`,
    undefined,
    credentials.accessToken,
  )
}

export async function sendWhatsAppText(to: string, body: string, credentials?: WhatsAppApiCredentials) {
  const config = credentials ?? getWhatsAppCloudConfig()
  return metaRequest<{ messages?: Array<{ id: string }> }>(`${config.phoneNumberId}/messages`, {
    method: "POST",
    body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", to, type: "text", text: { preview_url: false, body } }),
  }, credentials?.accessToken)
}

export async function exchangeWhatsAppSignupCode(code: string) {
  const config = getWhatsAppEmbeddedSignupConfig()
  const query = new URLSearchParams({ client_id: config.appId, client_secret: config.appSecret, code })
  const response = await fetch(`https://graph.facebook.com/${config.graphApiVersion}/oauth/access_token?${query}`, { cache: "no-store" })
  const payload = await response.json() as { access_token?: string; token_type?: string; expires_in?: number; error?: { message?: string } }
  if (!response.ok || !payload.access_token) throw new Error(payload.error?.message ?? "Meta did not return an access token")
  return {
    accessToken: payload.access_token,
    tokenType: payload.token_type,
    expiresIn: payload.expires_in,
  }
}

export async function inspectWhatsAppToken(accessToken: string) {
  const config = getWhatsAppEmbeddedSignupConfig()
  const query = new URLSearchParams({ input_token: accessToken, access_token: `${config.appId}|${config.appSecret}` })
  return metaRequest<{ data: { app_id?: string; user_id?: string; is_valid?: boolean; expires_at?: number; scopes?: string[] } }>(`debug_token?${query}`, undefined, accessToken)
}
