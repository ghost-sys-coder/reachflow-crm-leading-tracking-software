import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto"

function encryptionKey() {
  const secret = process.env.GMAIL_TOKEN_ENCRYPTION_KEY ?? process.env.WEBHOOK_ENCRYPTION_KEY
  if (!secret) throw new Error("GMAIL_TOKEN_ENCRYPTION_KEY is not configured")
  return createHash("sha256").update(`reachflow:gmail:${secret}`).digest()
}

export function encryptGmailToken(value: string) {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv)
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()])
  return Buffer.concat([Buffer.from([1]), iv, cipher.getAuthTag(), encrypted]).toString("base64")
}

export function decryptGmailToken(value: string) {
  const payload = Buffer.from(value, "base64")
  if (payload[0] !== 1) throw new Error("Unsupported Gmail token format")
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), payload.subarray(1, 13))
  decipher.setAuthTag(payload.subarray(13, 29))
  return Buffer.concat([decipher.update(payload.subarray(29)), decipher.final()]).toString("utf8")
}
