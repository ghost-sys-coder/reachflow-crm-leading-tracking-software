import { createAdminClient } from "@/lib/supabase/admin"
import {
  extractEmailAddresses,
  findGmailThreadIds,
  getGmailHeader,
  getGmailMessage,
  getGmailMessageBody,
  getGmailProfile,
  getGmailThread,
  getValidAccessToken,
  listGmailHistory,
  GmailApiError,
  type GmailConnectionRecord,
  type GmailMessage,
} from "@/lib/gmail/client"

type SyncConnection = GmailConnectionRecord & {
  org_id: string
  user_id: string
  email_address: string
  history_id: string | null
}

type ProspectIdentity = {
  id: string
  business_name: string
  handle: string | null
  status: string
  assigned_to: string | null
}

export type GmailSyncResult = {
  imported: number
  updated: number
  ignored: number
  replies: number
  historyId: string
}

function sentAt(message: GmailMessage): string {
  const milliseconds = Number(message.internalDate)
  return Number.isFinite(milliseconds) ? new Date(milliseconds).toISOString() : new Date().toISOString()
}

async function recordReply(connection: SyncConnection, prospect: ProspectIdentity, receivedAt: string, notify: boolean) {
  const admin = createAdminClient()
  if (!["booked", "closed", "dead"].includes(prospect.status)) {
    await admin.from("prospects").update({ status: "replied", last_reply_at: receivedAt }).eq("id", prospect.id).eq("org_id", connection.org_id)
  } else {
    await admin.from("prospects").update({ last_reply_at: receivedAt }).eq("id", prospect.id).eq("org_id", connection.org_id)
  }

  const { data: enrollments } = await admin
    .from("prospect_sequences")
    .select("id")
    .eq("org_id", connection.org_id)
    .eq("prospect_id", prospect.id)
    .eq("status", "active")
  const enrollmentIds = (enrollments ?? []).map((item) => item.id)
  if (enrollmentIds.length) {
    await admin.from("prospect_sequences").update({ status: "cancelled" }).in("id", enrollmentIds)
    await admin.from("prospect_sequence_steps").update({ status: "skipped" }).in("prospect_sequence_id", enrollmentIds).in("status", ["pending", "ready"])
  }

  if (notify) {
    await admin.from("activity_log").insert({
      org_id: connection.org_id,
      prospect_id: prospect.id,
      user_id: connection.user_id,
      actor_name: prospect.business_name,
      action: "reply_received",
      new_value: "gmail",
    })

    const recipientId = prospect.assigned_to ?? connection.user_id
    await admin.from("notifications").insert({
      org_id: connection.org_id,
      user_id: recipientId,
      actor_id: null,
      type: "gmail_reply",
      subject_id: prospect.id,
      message: `${prospect.business_name} replied by email`,
    })
  }
}

async function resolveProspect(
  connection: SyncConnection,
  message: GmailMessage,
  preferredProspect?: ProspectIdentity,
): Promise<ProspectIdentity | null> {
  if (preferredProspect) return preferredProspect
  const admin = createAdminClient()
  const { data: tracked } = await admin
    .from("messages")
    .select("prospect_id")
    .eq("org_id", connection.org_id)
    .eq("connection_id", connection.id)
    .eq("provider_thread_id", message.threadId)
    .limit(1)
    .maybeSingle()
  if (tracked?.prospect_id) {
    const { data } = await admin.from("prospects").select("id,business_name,handle,status,assigned_to").eq("id", tracked.prospect_id).maybeSingle()
    return data as ProspectIdentity | null
  }

  const participants = new Set([
    ...extractEmailAddresses(getGmailHeader(message, "From")),
    ...extractEmailAddresses(getGmailHeader(message, "To")),
    ...extractEmailAddresses(getGmailHeader(message, "Cc")),
  ].filter((email) => email !== connection.email_address.toLowerCase()))
  if (!participants.size) return null
  const { data: prospects } = await admin
    .from("prospects")
    .select("id,business_name,handle,status,assigned_to")
    .eq("org_id", connection.org_id)
    .eq("platform", "email")
  const matches = (prospects ?? []).filter((prospect) => prospect.handle && participants.has(prospect.handle.trim().toLowerCase()))
  return matches.length === 1 ? matches[0] as ProspectIdentity : null
}

async function persistMessage(
  connection: SyncConnection,
  message: GmailMessage,
  preferredProspect?: ProspectIdentity,
  notifyOnReply = true,
): Promise<"imported" | "updated" | "ignored" | "reply"> {
  const prospect = await resolveProspect(connection, message, preferredProspect)
  if (!prospect) return "ignored"

  const admin = createAdminClient()
  const from = extractEmailAddresses(getGmailHeader(message, "From"))
  const to = extractEmailAddresses(getGmailHeader(message, "To"))
  const cc = extractEmailAddresses(getGmailHeader(message, "Cc"))
  const direction = from.includes(connection.email_address.toLowerCase()) ? "outbound" : "inbound"
  const occurredAt = sentAt(message)
  const values = {
    org_id: connection.org_id,
    prospect_id: prospect.id,
    user_id: connection.user_id,
    message_type: "cold_email",
    subject: getGmailHeader(message, "Subject"),
    content: getGmailMessageBody(message),
    direction,
    recorded_at: occurredAt,
    was_sent: direction === "outbound",
    sent_at: occurredAt,
    provider: "gmail",
    provider_message_id: message.id,
    provider_thread_id: message.threadId,
    connection_id: connection.id,
    delivery_status: direction === "outbound" ? "sent" : "received",
    internet_message_id: getGmailHeader(message, "Message-ID"),
    in_reply_to: getGmailHeader(message, "In-Reply-To"),
    references_header: getGmailHeader(message, "References"),
    sender_email: from[0] ?? null,
    recipient_emails: to,
    cc_emails: cc,
    snippet: message.snippet ?? null,
    gmail_label_ids: message.labelIds ?? [],
    is_read: !(message.labelIds ?? []).includes("UNREAD"),
    synced_at: new Date().toISOString(),
  }
  const { data: existing } = await admin
    .from("messages")
    .select("id,direction")
    .eq("connection_id", connection.id)
    .eq("provider_message_id", message.id)
    .maybeSingle()
  if (existing) {
    await admin.from("messages").update(values).eq("id", existing.id)
    return "updated"
  }

  const { error } = await admin.from("messages").insert(values)
  if (error) throw new Error(`Could not store Gmail message: ${error.message}`)
  if (direction === "inbound") {
    await recordReply(connection, prospect, occurredAt, notifyOnReply)
    return "reply"
  }
  return "imported"
}

async function importThread(connection: SyncConnection, accessToken: string, threadId: string, prospect?: ProspectIdentity, notifyOnReply = true) {
  const thread = await getGmailThread(accessToken, threadId)
  const results: Array<"imported" | "updated" | "ignored" | "reply"> = []
  for (const message of [...(thread.messages ?? [])].sort((a, b) => Number(a.internalDate ?? 0) - Number(b.internalDate ?? 0))) {
    results.push(await persistMessage(connection, message, prospect, notifyOnReply))
  }
  return results
}

async function accessTokenFor(connection: SyncConnection) {
  const token = await getValidAccessToken(connection)
  if (token.refreshed) {
    const admin = createAdminClient()
    await admin.from("gmail_connections").update({
      access_token_ciphertext: token.refreshed.accessTokenCiphertext,
      token_expires_at: token.refreshed.expiresAt,
      status: "active",
      last_error: null,
      updated_at: new Date().toISOString(),
    }).eq("id", connection.id)
  }
  return token.accessToken
}

function summarize(results: Array<"imported" | "updated" | "ignored" | "reply">, historyId: string): GmailSyncResult {
  return {
    imported: results.filter((result) => result === "imported").length,
    updated: results.filter((result) => result === "updated").length,
    ignored: results.filter((result) => result === "ignored").length,
    replies: results.filter((result) => result === "reply").length,
    historyId,
  }
}

export async function initialGmailSync(connection: SyncConnection): Promise<GmailSyncResult> {
  const admin = createAdminClient()
  await admin.from("gmail_connections").update({ sync_status: "syncing", last_error: null }).eq("id", connection.id)
  try {
    const accessToken = await accessTokenFor(connection)
    const { data: prospects } = await admin
      .from("prospects")
      .select("id,business_name,handle,status,assigned_to")
      .eq("org_id", connection.org_id)
      .eq("platform", "email")
      .not("handle", "is", null)
    const results: Array<"imported" | "updated" | "ignored" | "reply"> = []
    const importedThreads = new Set<string>()
    const identities = (prospects ?? []) as ProspectIdentity[]
    const emailCounts = new Map<string, number>()
    for (const prospect of identities) {
      const email = prospect.handle?.trim().toLowerCase()
      if (email) emailCounts.set(email, (emailCounts.get(email) ?? 0) + 1)
    }
    for (const prospect of identities) {
      if (!prospect.handle) continue
      const email = prospect.handle.trim().toLowerCase()
      if (emailCounts.get(email) !== 1) continue
      for (const threadId of await findGmailThreadIds(accessToken, email)) {
        if (importedThreads.has(threadId)) continue
        importedThreads.add(threadId)
        results.push(...await importThread(connection, accessToken, threadId, prospect, false))
      }
    }
    const profile = await getGmailProfile(accessToken)
    const now = new Date().toISOString()
    await admin.from("gmail_connections").update({ history_id: profile.historyId, last_synced_at: now, sync_status: "idle", last_error: null, updated_at: now }).eq("id", connection.id)
    return summarize(results, profile.historyId)
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Gmail synchronization failed"
    await admin.from("gmail_connections").update({ sync_status: "error", last_error: reason, updated_at: new Date().toISOString() }).eq("id", connection.id)
    throw error
  }
}

export async function incrementalGmailSync(connection: SyncConnection): Promise<GmailSyncResult> {
  if (!connection.history_id) return initialGmailSync(connection)
  const admin = createAdminClient()
  await admin.from("gmail_connections").update({ sync_status: "syncing", last_error: null }).eq("id", connection.id)
  try {
    const accessToken = await accessTokenFor(connection)
    const history = await listGmailHistory(accessToken, connection.history_id)
    const results: Array<"imported" | "updated" | "ignored" | "reply"> = []
    for (const messageId of history.messageIds) {
      results.push(await persistMessage(connection, await getGmailMessage(accessToken, messageId)))
    }
    const now = new Date().toISOString()
    await admin.from("gmail_connections").update({ history_id: history.historyId, last_synced_at: now, sync_status: "idle", last_error: null, updated_at: now }).eq("id", connection.id)
    return summarize(results, history.historyId)
  } catch (error) {
    if (error instanceof GmailApiError && error.status === 404) return initialGmailSync(connection)
    const reason = error instanceof Error ? error.message : "Gmail synchronization failed"
    await admin.from("gmail_connections").update({ sync_status: "error", last_error: reason, updated_at: new Date().toISOString() }).eq("id", connection.id)
    throw error
  }
}
