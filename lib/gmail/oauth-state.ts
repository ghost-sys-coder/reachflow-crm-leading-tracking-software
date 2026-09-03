import { createHmac, randomBytes, timingSafeEqual } from "crypto"

type OAuthState = { userId: string; orgId: string; nonce: string; expiresAt: number }

function stateKey() {
  const key = process.env.GMAIL_OAUTH_STATE_SECRET ?? process.env.WEBHOOK_ENCRYPTION_KEY
  if (!key) throw new Error("GMAIL_OAUTH_STATE_SECRET is not configured")
  return key
}

export function createOAuthState(userId: string, orgId: string) {
  const payload: OAuthState = { userId, orgId, nonce: randomBytes(18).toString("hex"), expiresAt: Date.now() + 10 * 60_000 }
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url")
  const signature = createHmac("sha256", stateKey()).update(encoded).digest("base64url")
  return `${encoded}.${signature}`
}

export function verifyOAuthState(value: string): OAuthState | null {
  const [encoded, signature] = value.split(".")
  if (!encoded || !signature) return null
  const expected = createHmac("sha256", stateKey()).update(encoded).digest()
  const received = Buffer.from(signature, "base64url")
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as OAuthState
    return payload.expiresAt > Date.now() && payload.userId && payload.orgId ? payload : null
  } catch {
    return null
  }
}
