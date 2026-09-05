import { createHmac, timingSafeEqual } from "crypto"

export function verifyWhatsAppSignature(rawBody: string, signatureHeader: string | null, appSecret: string) {
  if (!signatureHeader?.startsWith("sha256=")) return false

  const supplied = signatureHeader.slice("sha256=".length)
  const expected = createHmac("sha256", appSecret).update(rawBody).digest("hex")
  if (!/^[a-f0-9]{64}$/i.test(supplied)) return false

  return timingSafeEqual(Buffer.from(supplied, "hex"), Buffer.from(expected, "hex"))
}

export function decodeMetaSignedRequest(value: string, appSecret: string) {
  const [encodedSignature, encodedPayload] = value.split(".")
  if (!encodedSignature || !encodedPayload) return null
  const supplied = Buffer.from(encodedSignature.replace(/-/g, "+").replace(/_/g, "/"), "base64")
  const expected = createHmac("sha256", appSecret).update(encodedPayload).digest()
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null
  try {
    return JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as { user_id?: string; issued_at?: number }
  } catch {
    return null
  }
}
