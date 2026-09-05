import { createHmac } from "crypto"

function required(name: string) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is not configured`)
  return value
}

function firstConfigured(names: string[]) {
  for (const name of names) {
    const value = process.env[name]?.trim()
    if (value) return { name, value }
  }
  throw new Error(`${names[0]} is not configured`)
}

function getMetaAppCredentials() {
  // META_* is canonical. APP_* supports the credentials already configured in
  // production, while WHATSAPP_* remains a temporary backwards-compatible alias.
  const appId = firstConfigured(["META_APP_ID", "APP_ID", "WHATSAPP_APP_ID"])
  const appSecret = firstConfigured(["META_APP_SECRET", "APP_SECRET", "WHATSAPP_APP_SECRET"])

  if (!/^\d{5,25}$/.test(appId.value)) {
    throw new Error(`${appId.name} must be the numeric Meta App ID, not a WhatsApp phone number`)
  }
  if (!/^[a-f\d]{32,64}$/i.test(appSecret.value)) {
    throw new Error(`${appSecret.name} does not look like a valid Meta App Secret`)
  }

  return { appId: appId.value, appSecret: appSecret.value }
}

function getEmbeddedSignupConfigurationId() {
  const configured = firstConfigured([
    "WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID",
    "NEXT_PUBLIC_WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID",
  ])
  if (!/^\d{8,25}$/.test(configured.value)) {
    throw new Error(`${configured.name} must be the numeric Facebook Login for Business configuration ID`)
  }
  return configured.value
}

export function getWhatsAppWebhookVerifyToken() {
  const configured = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN?.trim()
  if (configured) return configured

  const { appId, appSecret } = getMetaAppCredentials()
  return createHmac("sha256", appSecret)
    .update(`reachflow:whatsapp:webhook:${appId}`)
    .digest("hex")
}

export function getWhatsAppAppSecret() {
  return getMetaAppCredentials().appSecret
}

export function getWhatsAppCloudConfig() {
  const { appId, appSecret } = getMetaAppCredentials()
  return {
    appId,
    appSecret,
    accessToken: required("WHATSAPP_ACCESS_TOKEN"),
    phoneNumberId: required("WHATSAPP_PHONE_NUMBER_ID"),
    businessAccountId: required("WHATSAPP_BUSINESS_ACCOUNT_ID"),
    graphApiVersion: process.env.WHATSAPP_GRAPH_API_VERSION?.trim() || "v24.0",
  }
}

export function getWhatsAppEmbeddedSignupConfig() {
  const { appId, appSecret } = getMetaAppCredentials()
  return {
    appId,
    appSecret,
    configurationId: getEmbeddedSignupConfigurationId(),
    graphApiVersion: process.env.WHATSAPP_GRAPH_API_VERSION?.trim() || "v24.0",
  }
}
