"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { getAuthedOrgClient, type OrgContext } from "@/lib/auth/org"
import { canContactProspect } from "@/lib/compliance/can-contact"
import { createRawEmail, getValidAccessToken, GmailApiError, sendRawGmail, watchGmailMailbox, type GmailConnectionRecord } from "@/lib/gmail/client"
import { incrementalGmailSync, type GmailSyncResult } from "@/lib/gmail/sync"
import { fail, ok } from "@/lib/validation/result"
import { logActivity } from "@/lib/activity/log"
import type { ActionResult, Message } from "@/types/database"

const emailSchema = z.string().trim().email()
const sendInputSchema = z.object({ prospect_id: z.string().uuid(), subject: z.string().trim().min(1).max(200), content: z.string().trim().min(1).max(5000) })

export type GmailConnectionSummary = { id: string; email_address: string; status: string; last_used_at: string | null; last_error: string | null; last_synced_at: string | null; sync_status: string; granted_scopes: string[]; automatic_sync_available: boolean }

export async function getGmailConnection(): Promise<ActionResult<GmailConnectionSummary | null>> {
  const { ctx, error } = await getAuthedOrgClient()
  if (!ctx) return fail(error)
  const { data, error: dbError } = await ctx.supabase.from("gmail_connections").select("id,email_address,status,last_used_at,last_error,last_synced_at,sync_status,granted_scopes").eq("org_id", ctx.orgId).eq("user_id", ctx.userId).maybeSingle()
  if (dbError) return fail(dbError.message)
  return ok(data ? { ...data, automatic_sync_available: Boolean(process.env.GMAIL_PUBSUB_TOPIC) } as GmailConnectionSummary : null)
}

export async function disconnectGmail(): Promise<ActionResult<{ disconnected: true }>> {
  const { ctx, error } = await getAuthedOrgClient()
  if (!ctx) return fail(error)
  const { data: connection } = await ctx.supabase.from("gmail_connections").select("refresh_token_ciphertext").eq("org_id", ctx.orgId).eq("user_id", ctx.userId).maybeSingle()
  if (connection) {
    const { decryptGmailToken } = await import("@/lib/gmail/crypto")
    const token = decryptGmailToken(connection.refresh_token_ciphertext)
    await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" } }).catch(() => undefined)
  }
  const { error: deleteError } = await ctx.supabase.from("gmail_connections").delete().eq("org_id", ctx.orgId).eq("user_id", ctx.userId)
  if (deleteError) return fail(deleteError.message)
  revalidatePath("/settings")
  return ok({ disconnected: true })
}

async function deliverMessage(ctx: OrgContext, message: Message, to: string): Promise<ActionResult<Message>> {
  const { data: connection, error } = await ctx.supabase.from("gmail_connections").select("*").eq("org_id", ctx.orgId).eq("user_id", ctx.userId).eq("status", "active").maybeSingle()
  if (error || !connection) return fail("Connect an active Gmail account in Settings before sending")

  const idempotencyKey = `gmail:message:${message.id}`
  const { data: claimed, error: claimError } = await ctx.supabase.rpc("claim_gmail_delivery", { p_org_id: ctx.orgId, p_message_id: message.id, p_connection_id: connection.id, p_idempotency_key: idempotencyKey }).maybeSingle()
  if (claimError) return fail(`Could not prepare Gmail delivery: ${claimError.message}`)
  if (!claimed) return fail("This message is already sent or currently being delivered")
  try {
    const token = await getValidAccessToken(connection as GmailConnectionRecord)
    if (token.refreshed) await ctx.supabase.from("gmail_connections").update({ access_token_ciphertext: token.refreshed.accessTokenCiphertext, token_expires_at: token.refreshed.expiresAt, status: "active", last_error: null, updated_at: new Date().toISOString() }).eq("id", connection.id)
    const { data: previous } = await ctx.supabase
      .from("messages")
      .select("provider_thread_id,internet_message_id,references_header,subject")
      .eq("org_id", ctx.orgId)
      .eq("prospect_id", message.prospect_id)
      .eq("connection_id", connection.id)
      .eq("provider", "gmail")
      .neq("id", message.id)
      .not("provider_thread_id", "is", null)
      .order("sent_at", { ascending: false })
      .limit(1)
      .maybeSingle()
    const effectiveSubject = previous?.subject ?? message.subject ?? ""
    const sent = await sendRawGmail(
      token.accessToken,
      createRawEmail({ to, subject: effectiveSubject, body: message.content, replyMessageId: previous?.internet_message_id ?? null, references: previous?.references_header ?? null }),
      previous?.provider_thread_id ?? null,
    )
    const sentAt = new Date().toISOString()
    await ctx.supabase.from("messages").update({ subject: effectiveSubject, was_sent: true, sent_at: sentAt, provider: "gmail", provider_message_id: sent.messageId, provider_thread_id: sent.threadId, connection_id: connection.id, delivery_status: "sent" }).eq("id", message.id).eq("org_id", ctx.orgId)
    await ctx.supabase.from("email_deliveries").update({ status: "sent", provider_message_id: sent.messageId, provider_thread_id: sent.threadId, sent_at: sentAt, updated_at: sentAt }).eq("idempotency_key", idempotencyKey)
    await ctx.supabase.from("gmail_connections").update({ last_used_at: sentAt, last_error: null }).eq("id", connection.id)
    await ctx.supabase.from("prospects").update({ last_contacted_at: sentAt }).eq("id", message.prospect_id).eq("org_id", ctx.orgId)
    void logActivity({ orgId: ctx.orgId, prospectId: message.prospect_id, userId: ctx.userId, action: "outreach_sent", newValue: "gmail" })
    revalidatePath("/prospects", "layout"); revalidatePath("/pipeline"); revalidatePath("/messages")
    return ok({ ...message, was_sent: true, sent_at: new Date(sentAt), provider: "gmail", provider_message_id: sent.messageId, provider_thread_id: sent.threadId, connection_id: connection.id, delivery_status: "sent" } as Message)
  } catch (cause) {
    const reason = cause instanceof Error ? cause.message : "Gmail delivery failed"
    await ctx.supabase.from("email_deliveries").update({ status: "failed", last_error: reason, updated_at: new Date().toISOString() }).eq("idempotency_key", idempotencyKey)
    await ctx.supabase.from("messages").update({ delivery_status: "failed" }).eq("id", message.id).eq("org_id", ctx.orgId)
    await ctx.supabase.from("gmail_connections").update({ ...(cause instanceof GmailApiError && cause.authorizationFailure ? { status: "error" } : {}), last_error: reason, updated_at: new Date().toISOString() }).eq("id", connection.id)
    return fail(reason)
  }
}

export async function syncGmailNow(): Promise<ActionResult<GmailSyncResult>> {
  const { ctx, error } = await getAuthedOrgClient()
  if (!ctx) return fail(error)
  if (ctx.role === "viewer") return fail("Insufficient permissions")
  const { data: connection } = await ctx.supabase.from("gmail_connections").select("*").eq("org_id", ctx.orgId).eq("user_id", ctx.userId).eq("status", "active").maybeSingle()
  if (!connection) return fail("Connect an active Gmail account before synchronizing")
  try {
    const result = await incrementalGmailSync(connection as GmailConnectionRecord & { org_id: string; user_id: string; email_address: string; history_id: string | null })
    revalidatePath("/prospects", "layout"); revalidatePath("/pipeline"); revalidatePath("/messages"); revalidatePath("/settings")
    return ok(result)
  } catch (cause) {
    return fail(cause instanceof Error ? cause.message : "Gmail synchronization failed")
  }
}

export async function renewGmailWatch(): Promise<ActionResult<{ expiration: string }>> {
  const { ctx, error } = await getAuthedOrgClient()
  if (!ctx) return fail(error)
  if (ctx.role === "viewer") return fail("Insufficient permissions")
  const topicName = process.env.GMAIL_PUBSUB_TOPIC
  if (!topicName) return fail("GMAIL_PUBSUB_TOPIC is not configured")
  const { data: connection } = await ctx.supabase.from("gmail_connections").select("*").eq("org_id", ctx.orgId).eq("user_id", ctx.userId).eq("status", "active").maybeSingle()
  if (!connection) return fail("Connect an active Gmail account before enabling automatic sync")
  try {
    const token = await getValidAccessToken(connection as GmailConnectionRecord)
    const watch = await watchGmailMailbox(token.accessToken, topicName)
    await ctx.supabase.from("gmail_connections").update({ history_id: connection.history_id ?? watch.historyId, watch_expiration_at: watch.expiration, last_error: null }).eq("id", connection.id)
    return ok({ expiration: watch.expiration })
  } catch (cause) {
    return fail(cause instanceof Error ? cause.message : "Could not enable automatic Gmail sync")
  }
}

export async function sendGmailOutreach(input: z.infer<typeof sendInputSchema>): Promise<ActionResult<Message>> {
  const parsed = sendInputSchema.safeParse(input)
  if (!parsed.success) return fail(parsed.error.issues[0].message)
  const { ctx, error } = await getAuthedOrgClient()
  if (!ctx) return fail(error)
  if (ctx.role === "viewer") return fail("Insufficient permissions")
  const permission = await canContactProspect(ctx, parsed.data.prospect_id)
  if (!permission.allowed) return fail(permission.reason ?? "This prospect cannot be contacted")
  const { data: prospect } = await ctx.supabase.from("prospects").select("handle,platform").eq("id", parsed.data.prospect_id).eq("org_id", ctx.orgId).maybeSingle()
  const recipient = emailSchema.safeParse(prospect?.handle)
  if (!recipient.success || prospect?.platform !== "email") return fail("This prospect does not have a valid email address")
  const { data, error: insertError } = await ctx.supabase.from("messages").insert({ org_id: ctx.orgId, prospect_id: parsed.data.prospect_id, user_id: ctx.userId, message_type: "cold_email", subject: parsed.data.subject, content: parsed.data.content, direction: "outbound", was_sent: false, delivery_status: "pending" }).select().single()
  if (insertError) return fail(insertError.message)
  return deliverMessage(ctx, data as Message, recipient.data)
}

export async function sendSavedMessageWithGmail(messageId: string): Promise<ActionResult<Message>> {
  const { ctx, error } = await getAuthedOrgClient()
  if (!ctx) return fail(error)
  if (ctx.role === "viewer") return fail("Insufficient permissions")
  const { data: message } = await ctx.supabase.from("messages").select("*").eq("id", messageId).eq("org_id", ctx.orgId).eq("user_id", ctx.userId).maybeSingle()
  if (!message) return fail("Message not found")
  if (message.was_sent) return fail("This message has already been sent")
  if (!message.subject) return fail("An email subject is required")
  const permission = await canContactProspect(ctx, message.prospect_id)
  if (!permission.allowed) return fail(permission.reason ?? "This prospect cannot be contacted")
  const { data: prospect } = await ctx.supabase.from("prospects").select("handle,platform").eq("id", message.prospect_id).eq("org_id", ctx.orgId).maybeSingle()
  const recipient = emailSchema.safeParse(prospect?.handle)
  if (!recipient.success || prospect?.platform !== "email") return fail("This prospect does not have a valid email address")
  return deliverMessage(ctx, message as Message, recipient.data)
}
