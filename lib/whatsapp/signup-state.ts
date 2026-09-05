import { createHmac, timingSafeEqual } from "crypto"

type SignupState = { orgId: string; userId: string; expiresAt: number }

function secret() {
  const value = process.env.WHATSAPP_OAUTH_STATE_SECRET ?? process.env.WEBHOOK_ENCRYPTION_KEY
  if (!value) throw new Error("WEBHOOK_ENCRYPTION_KEY is not configured")
  return value
}

function signature(payload: string) {
  return createHmac("sha256", secret()).update(`reachflow:whatsapp:signup:${payload}`).digest("base64url")
}

export function createWhatsAppSignupState(orgId: string, userId: string) {
  const payload = Buffer.from(JSON.stringify({ orgId, userId, expiresAt: Date.now() + 10 * 60_000 } satisfies SignupState)).toString("base64url")
  return `${payload}.${signature(payload)}`
}

export function verifyWhatsAppSignupState(value: string, orgId: string, userId: string) {
  const [payload, supplied] = value.split(".")
  if (!payload || !supplied) return false
  const expected = signature(payload)
  if (supplied.length !== expected.length || !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) return false
  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as SignupState
    return decoded.orgId === orgId && decoded.userId === userId && decoded.expiresAt > Date.now()
  } catch {
    return false
  }
}
