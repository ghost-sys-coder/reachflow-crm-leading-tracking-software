import { getGoogleOAuthConfig } from "@/lib/gmail/config"
import { decryptGmailToken, encryptGmailToken } from "@/lib/gmail/crypto"

export type GmailConnectionRecord = {
  id: string
  access_token_ciphertext: string
  refresh_token_ciphertext: string
  token_expires_at: string | null
}

export class GmailApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly authorizationFailure = false) {
    super(message)
    this.name = "GmailApiError"
  }
}

export async function exchangeAuthorizationCode(code: string) {
  const { clientId, clientSecret, redirectUri } = getGoogleOAuthConfig()
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: "authorization_code" }),
    cache: "no-store",
  })
  const data = await response.json() as { access_token?: string; refresh_token?: string; expires_in?: number; scope?: string; error_description?: string }
  if (!response.ok || !data.access_token) throw new Error(data.error_description ?? "Google did not return an access token")
  return data
}

export async function getGoogleIdentity(accessToken: string) {
  const response = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { authorization: `Bearer ${accessToken}` }, cache: "no-store" })
  const data = await response.json() as { sub?: string; email?: string; email_verified?: boolean }
  if (!response.ok || !data.sub || !data.email || !data.email_verified) throw new Error("Could not verify the connected Google account")
  return { id: data.sub, email: data.email.toLowerCase() }
}

export async function refreshAccessToken(refreshTokenCiphertext: string) {
  const { clientId, clientSecret } = getGoogleOAuthConfig()
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: decryptGmailToken(refreshTokenCiphertext), grant_type: "refresh_token" }),
    cache: "no-store",
  })
  const data = await response.json() as { access_token?: string; expires_in?: number; error_description?: string }
  if (!response.ok || !data.access_token) throw new GmailApiError(data.error_description ?? "Gmail authorization has expired; reconnect the account", response.status, true)
  return { accessToken: data.access_token, accessTokenCiphertext: encryptGmailToken(data.access_token), expiresAt: new Date(Date.now() + (data.expires_in ?? 3600) * 1000).toISOString() }
}

export async function getValidAccessToken(connection: GmailConnectionRecord) {
  if (connection.token_expires_at && new Date(connection.token_expires_at).getTime() > Date.now() + 60_000) {
    return { accessToken: decryptGmailToken(connection.access_token_ciphertext), refreshed: null }
  }
  const refreshed = await refreshAccessToken(connection.refresh_token_ciphertext)
  return { accessToken: refreshed.accessToken, refreshed }
}

function cleanHeader(value: string) {
  return value.replace(/[\r\n]+/g, " ").trim()
}

function encodeHeader(value: string) {
  const clean = cleanHeader(value)
  return /[^\x20-\x7E]/.test(clean) ? `=?UTF-8?B?${Buffer.from(clean, "utf8").toString("base64")}?=` : clean
}

export function createRawEmail(input: { to: string; subject: string; body: string; fromName?: string | null; replyMessageId?: string | null }) {
  const headers = [
    `To: ${cleanHeader(input.to)}`,
    `Subject: ${encodeHeader(input.subject)}`,
    ...(input.fromName ? [`From: ${cleanHeader(input.fromName)}`] : []),
    ...(input.replyMessageId ? [`In-Reply-To: ${cleanHeader(input.replyMessageId)}`, `References: ${cleanHeader(input.replyMessageId)}`] : []),
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
  ]
  return Buffer.from(`${headers.join("\r\n")}\r\n\r\n${input.body}`, "utf8").toString("base64url")
}

export async function sendRawGmail(accessToken: string, raw: string, threadId?: string | null) {
  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
    body: JSON.stringify({ raw, ...(threadId ? { threadId } : {}) }),
    cache: "no-store",
  })
  const data = await response.json() as { id?: string; threadId?: string; error?: { message?: string } }
  if (!response.ok || !data.id) throw new GmailApiError(data.error?.message ?? "Gmail could not send the message", response.status, response.status === 401 || response.status === 403)
  return { messageId: data.id, threadId: data.threadId ?? null }
}
