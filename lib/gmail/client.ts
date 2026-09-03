import { getGoogleOAuthConfig } from "@/lib/gmail/config"
import { decryptGmailToken, encryptGmailToken } from "@/lib/gmail/crypto"

export type GmailConnectionRecord = {
  id: string
  access_token_ciphertext: string
  refresh_token_ciphertext: string
  token_expires_at: string | null
}

export type GmailHeader = { name: string; value: string }
export type GmailMessagePart = {
  mimeType?: string
  filename?: string
  headers?: GmailHeader[]
  body?: { data?: string; size?: number }
  parts?: GmailMessagePart[]
}
export type GmailMessage = {
  id: string
  threadId: string
  labelIds?: string[]
  snippet?: string
  historyId?: string
  internalDate?: string
  payload?: GmailMessagePart
}
export type GmailThread = { id: string; historyId?: string; messages?: GmailMessage[] }

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

export function createRawEmail(input: { to: string; subject: string; body: string; fromName?: string | null; replyMessageId?: string | null; references?: string | null }) {
  const references = [input.references, input.replyMessageId].filter(Boolean).join(" ")
  const headers = [
    `To: ${cleanHeader(input.to)}`,
    `Subject: ${encodeHeader(input.subject)}`,
    ...(input.fromName ? [`From: ${cleanHeader(input.fromName)}`] : []),
    ...(input.replyMessageId ? [`In-Reply-To: ${cleanHeader(input.replyMessageId)}`, `References: ${cleanHeader(references)}`] : []),
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

async function gmailGet<T>(accessToken: string, path: string, params?: URLSearchParams): Promise<T> {
  const url = new URL(`https://gmail.googleapis.com/gmail/v1/users/me/${path}`)
  if (params) url.search = params.toString()
  const response = await fetch(url, {
    headers: { authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  })
  const data = await response.json() as T & { error?: { message?: string } }
  if (!response.ok) {
    throw new GmailApiError(
      data.error?.message ?? "Gmail could not retrieve mailbox data",
      response.status,
      response.status === 401 || response.status === 403,
    )
  }
  return data
}

export function getGmailHeader(message: GmailMessage, name: string): string | null {
  return message.payload?.headers?.find((header) => header.name.toLowerCase() === name.toLowerCase())?.value ?? null
}

function decodeBody(data?: string): string {
  if (!data) return ""
  return Buffer.from(data, "base64url").toString("utf8")
}

function findBody(part: GmailMessagePart | undefined, mimeType: string): string {
  if (!part) return ""
  if (part.mimeType === mimeType && part.body?.data) return decodeBody(part.body.data)
  for (const child of part.parts ?? []) {
    const body = findBody(child, mimeType)
    if (body) return body
  }
  return ""
}

export function getGmailMessageBody(message: GmailMessage): string {
  const plain = findBody(message.payload, "text/plain")
  if (plain) return plain.trim()
  const html = findBody(message.payload, "text/html")
  if (!html) return message.snippet?.trim() ?? ""
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

export function extractEmailAddresses(value: string | null): string[] {
  if (!value) return []
  return [...value.matchAll(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)]
    .map((match) => match[0].toLowerCase())
}

export async function getGmailMessage(accessToken: string, messageId: string) {
  return gmailGet<GmailMessage>(accessToken, `messages/${encodeURIComponent(messageId)}`, new URLSearchParams({ format: "full" }))
}

export async function getGmailThread(accessToken: string, threadId: string) {
  return gmailGet<GmailThread>(accessToken, `threads/${encodeURIComponent(threadId)}`, new URLSearchParams({ format: "full" }))
}

export async function findGmailThreadIds(accessToken: string, email: string): Promise<string[]> {
  const ids = new Set<string>()
  let pageToken: string | undefined
  do {
    const params = new URLSearchParams({ q: `newer_than:2y {from:${email} to:${email}}`, maxResults: "100" })
    if (pageToken) params.set("pageToken", pageToken)
    const page = await gmailGet<{ messages?: Array<{ id: string; threadId: string }>; nextPageToken?: string }>(accessToken, "messages", params)
    for (const message of page.messages ?? []) ids.add(message.threadId)
    pageToken = page.nextPageToken
  } while (pageToken)
  return [...ids]
}

export async function listGmailHistory(accessToken: string, startHistoryId: string) {
  const messageIds = new Set<string>()
  let pageToken: string | undefined
  let latestHistoryId = startHistoryId
  do {
    const params = new URLSearchParams({ startHistoryId, historyTypes: "messageAdded", maxResults: "500" })
    if (pageToken) params.set("pageToken", pageToken)
    const page = await gmailGet<{
      history?: Array<{ messagesAdded?: Array<{ message: { id: string } }> }>
      historyId?: string
      nextPageToken?: string
    }>(accessToken, "history", params)
    for (const record of page.history ?? []) {
      for (const added of record.messagesAdded ?? []) messageIds.add(added.message.id)
    }
    if (page.historyId) latestHistoryId = page.historyId
    pageToken = page.nextPageToken
  } while (pageToken)
  return { messageIds: [...messageIds], historyId: latestHistoryId }
}

export async function getGmailProfile(accessToken: string) {
  return gmailGet<{ emailAddress: string; historyId: string; messagesTotal: number; threadsTotal: number }>(accessToken, "profile")
}

export async function watchGmailMailbox(accessToken: string, topicName: string) {
  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/watch", {
    method: "POST",
    headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
    body: JSON.stringify({ topicName }),
    cache: "no-store",
  })
  const data = await response.json() as { historyId?: string; expiration?: string; error?: { message?: string } }
  if (!response.ok || !data.historyId || !data.expiration) {
    throw new GmailApiError(data.error?.message ?? "Gmail watch could not be created", response.status, response.status === 401 || response.status === 403)
  }
  return { historyId: data.historyId, expiration: new Date(Number(data.expiration)).toISOString() }
}
