import { createHmac, timingSafeEqual } from "crypto"

export function signInboundPayload(secret: string, timestamp: string, body: string) {
  return createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex")
}

export function verifyInboundSignature(secret: string, timestamp: string | null, signature: string | null, body: string) {
  if (!timestamp || !signature || !/^\d+$/.test(timestamp)) return false
  if (Math.abs(Date.now() - Number(timestamp) * 1000) > 5 * 60_000) return false
  const supplied = signature.replace(/^v1=/, "")
  const expected = signInboundPayload(secret, timestamp, body)
  if (!/^[a-f0-9]{64}$/i.test(supplied)) return false
  return timingSafeEqual(Buffer.from(supplied, "hex"), Buffer.from(expected, "hex"))
}
