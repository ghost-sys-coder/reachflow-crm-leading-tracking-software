import { createHmac, timingSafeEqual } from "crypto"

export function verifyWhatsAppSignature(rawBody: string, signatureHeader: string | null, appSecret: string) {
  if (!signatureHeader?.startsWith("sha256=")) return false

  const supplied = signatureHeader.slice("sha256=".length)
  const expected = createHmac("sha256", appSecret).update(rawBody).digest("hex")
  if (!/^[a-f0-9]{64}$/i.test(supplied)) return false

  return timingSafeEqual(Buffer.from(supplied, "hex"), Buffer.from(expected, "hex"))
}
