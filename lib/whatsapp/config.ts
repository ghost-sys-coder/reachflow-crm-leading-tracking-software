import { createHmac } from "crypto"

function required(name: string) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is not configured`)
  return value
}

export function getWhatsAppWebhookVerifyToken() {
  const configured = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN?.trim()
  if (configured) return configured

  const appId = required("WHATSAPP_APP_ID")
  const appSecret = required("WHATSAPP_APP_SECRET")
  return createHmac("sha256", appSecret)
    .update(`reachflow:whatsapp:webhook:${appId}`)
    .digest("hex")
}

export function getWhatsAppAppSecret() {
  return required("WHATSAPP_APP_SECRET")
}

export function getWhatsAppCloudConfig() {
  return {
    appId: required("WHATSAPP_APP_ID"),
    appSecret: getWhatsAppAppSecret(),
    accessToken: required("WHATSAPP_ACCESS_TOKEN"),
    phoneNumberId: required("WHATSAPP_PHONE_NUMBER_ID"),
    businessAccountId: required("WHATSAPP_BUSINESS_ACCOUNT_ID"),
    graphApiVersion: process.env.WHATSAPP_GRAPH_API_VERSION?.trim() || "v24.0",
  }
}

export function getWhatsAppEmbeddedSignupConfig() {
  return {
    appId: required("WHATSAPP_APP_ID"),
    appSecret: getWhatsAppAppSecret(),
    configurationId: required("NEXT_PUBLIC_WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID"),
    graphApiVersion: process.env.WHATSAPP_GRAPH_API_VERSION?.trim() || "v24.0",
  }
}
