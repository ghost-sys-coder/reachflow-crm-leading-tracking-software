"use server"

import { revalidatePath } from "next/cache"

import { getAuthedClient } from "@/lib/auth/session"
import { getAuthedOrgClient } from "@/lib/auth/org"
import { fail, ok, zodErrorMessage } from "@/lib/validation/result"
import { logActivity } from "@/lib/activity/log"
import { canContactProspect } from "@/lib/compliance/can-contact"
import { runAutomations } from "@/lib/automation/engine"
import { publishWebhookEvent } from "@/lib/webhooks/publish"
import {
  messageCreateSchema,
  callRecordSchema,
  replyRecordSchema,
  type CallRecordInput,
  type MessageCreateInput,
  type ReplyRecordInput,
} from "@/lib/validation/schemas"
import type {
  ActionResult,
  Message,
  MessageWithProspect,
} from "@/types/database"

export async function saveMessage(
  input: MessageCreateInput,
): Promise<ActionResult<Message>> {
  const parsed = messageCreateSchema.safeParse(input)
  if (!parsed.success) return fail(zodErrorMessage(parsed.error))

  const { ctx, error } = await getAuthedOrgClient()
  if (!ctx) return fail(error)

  const { data, error: insertError } = await ctx.supabase
    .from("messages")
    .insert({ ...parsed.data, user_id: ctx.userId, org_id: ctx.orgId })
    .select()
    .single()

  if (insertError) return fail(insertError.message)
  void logActivity({
    orgId: ctx.orgId,
    prospectId: parsed.data.prospect_id,
    userId: ctx.userId,
    action: "message_saved",
    newValue: parsed.data.message_type,
  })
  revalidatePath("/prospects", "layout")
  return ok(data as Message)
}

export async function recordSentOutreach(
  input: MessageCreateInput,
): Promise<ActionResult<Message>> {
  const parsed = messageCreateSchema.safeParse(input)
  if (!parsed.success) return fail(zodErrorMessage(parsed.error))

  const { ctx, error } = await getAuthedOrgClient()
  if (!ctx) return fail(error)
  if (ctx.role === "viewer") return fail("Insufficient permissions")
  const permission = await canContactProspect(ctx, parsed.data.prospect_id)
  if (!permission.allowed) return fail(permission.reason ?? "This prospect cannot be contacted")

  const sentAt = new Date().toISOString()
  const { data, error: insertError } = await ctx.supabase
    .from("messages")
    .insert({
      ...parsed.data,
      user_id: ctx.userId,
      org_id: ctx.orgId,
      was_sent: true,
      sent_at: sentAt,
    })
    .select()
    .single()
  if (insertError) return fail(insertError.message)

  await ctx.supabase
    .from("prospects")
    .update({ last_contacted_at: sentAt })
    .eq("id", parsed.data.prospect_id)
    .eq("org_id", ctx.orgId)

  void logActivity({ orgId: ctx.orgId, prospectId: parsed.data.prospect_id, userId: ctx.userId, action: "outreach_sent", newValue: parsed.data.message_type })
  revalidatePath("/prospects", "layout")
  revalidatePath("/pipeline")
  revalidatePath("/messages")
  return ok(data as Message)
}

export async function recordCall(input: CallRecordInput): Promise<ActionResult<Message>> {
  const parsed = callRecordSchema.safeParse(input)
  if (!parsed.success) return fail(zodErrorMessage(parsed.error))

  const { ctx, error } = await getAuthedOrgClient()
  if (!ctx) return fail(error)
  if (ctx.role === "viewer") return fail("Insufficient permissions")
  const permission = await canContactProspect(ctx, parsed.data.prospect_id)
  if (!permission.allowed) return fail(permission.reason ?? "This prospect cannot be contacted")

  const occurredAt = parsed.data.recorded_at?.toISOString() ?? new Date().toISOString()
  const callbackAt = parsed.data.callback_at?.toISOString() ?? null
  const { data, error: insertError } = await ctx.supabase
    .from("messages")
    .insert({
      prospect_id: parsed.data.prospect_id,
      message_type: "call_note",
      content: parsed.data.content,
      subject: parsed.data.subject ?? null,
      direction: "outbound",
      call_outcome: parsed.data.call_outcome,
      call_duration_seconds: parsed.data.call_duration_seconds ?? null,
      callback_at: callbackAt,
      next_action: parsed.data.next_action ?? null,
      recorded_at: occurredAt,
      user_id: ctx.userId,
      org_id: ctx.orgId,
      was_sent: true,
      sent_at: occurredAt,
    })
    .select()
    .single()
  if (insertError) return fail(insertError.message)

  const prospectChanges: Record<string, string | null> = { last_contacted_at: occurredAt }
  if (callbackAt) prospectChanges.follow_up_at = callbackAt
  if (parsed.data.call_outcome === "connected") prospectChanges.status = "waiting"
  if (parsed.data.call_outcome === "disqualified") prospectChanges.status = "dead"
  await ctx.supabase.from("prospects").update(prospectChanges).eq("id", parsed.data.prospect_id).eq("org_id", ctx.orgId)

  void logActivity({ orgId: ctx.orgId, prospectId: parsed.data.prospect_id, userId: ctx.userId, action: "outreach_sent", newValue: `call:${parsed.data.call_outcome}` })
  revalidateOutreachViews()
  return ok(data as Message)
}

export async function recordReply(input: ReplyRecordInput): Promise<ActionResult<Message>> {
  const parsed = replyRecordSchema.safeParse(input)
  if (!parsed.success) return fail(zodErrorMessage(parsed.error))

  const { ctx, error } = await getAuthedOrgClient()
  if (!ctx) return fail(error)
  if (ctx.role === "viewer") return fail("Insufficient permissions")

  const receivedAt = parsed.data.received_at?.toISOString() ?? new Date().toISOString()
  const { data, error: insertError } = await ctx.supabase
    .from("messages")
    .insert({
      prospect_id: parsed.data.prospect_id,
      message_type: parsed.data.message_type,
      content: parsed.data.content,
      subject: parsed.data.subject ?? null,
      direction: "inbound",
      reply_intent: parsed.data.reply_intent,
      objection_code: parsed.data.objection_code ?? null,
      recorded_at: receivedAt,
      user_id: ctx.userId,
      org_id: ctx.orgId,
      was_sent: false,
      sent_at: null,
    })
    .select()
    .single()
  if (insertError) return fail(insertError.message)

  const prospectChanges: Record<string, string | null> = {}
  if (parsed.data.reply_intent === "interested" || parsed.data.reply_intent === "question") prospectChanges.status = "replied"
  if (parsed.data.reply_intent === "not_now") {
    prospectChanges.status = "waiting"
    prospectChanges.follow_up_at = parsed.data.revisit_at!.toISOString()
  }
  if (parsed.data.reply_intent === "not_interested" || parsed.data.reply_intent === "disqualified") prospectChanges.status = "dead"
  if (Object.keys(prospectChanges).length) {
    await ctx.supabase.from("prospects").update(prospectChanges).eq("id", parsed.data.prospect_id).eq("org_id", ctx.orgId)
  }

  if (["interested", "question", "not_interested", "disqualified"].includes(parsed.data.reply_intent)) {
    const { data: activeSequences } = await ctx.supabase.from("prospect_sequences").select("id").eq("org_id", ctx.orgId).eq("prospect_id", parsed.data.prospect_id).eq("status", "active")
    const ids = (activeSequences ?? []).map((sequence) => sequence.id)
    if (ids.length) {
      await ctx.supabase.from("prospect_sequences").update({ status: "cancelled" }).in("id", ids)
      await ctx.supabase.from("prospect_sequence_steps").update({ status: "skipped", completed_at: receivedAt }).in("prospect_sequence_id", ids).in("status", ["pending", "ready"])
    }
  }

  void logActivity({ orgId: ctx.orgId, prospectId: parsed.data.prospect_id, userId: ctx.userId, action: "message_saved", newValue: `reply:${parsed.data.reply_intent}` })
  await runAutomations(ctx, "reply_recorded", parsed.data.prospect_id, `reply_recorded:${(data as Message).id}`)
  await publishWebhookEvent(ctx,"reply.recorded",parsed.data.prospect_id,{reply:{id:(data as Message).id,intent:parsed.data.reply_intent,message_type:parsed.data.message_type,received_at:receivedAt},prospect_id:parsed.data.prospect_id},`reply.recorded:${(data as Message).id}`)
  revalidateOutreachViews()
  return ok(data as Message)
}

function revalidateOutreachViews() {
  revalidatePath("/prospects", "layout")
  revalidatePath("/pipeline")
  revalidatePath("/messages")
  revalidatePath("/analytics")
}

export async function markMessageAsSent(id: string): Promise<ActionResult<Message>> {
  const { ctx, error } = await getAuthedOrgClient()
  if (!ctx) return fail(error)
  const { data: pending } = await ctx.supabase.from("messages").select("prospect_id").eq("id",id).eq("org_id",ctx.orgId).maybeSingle()
  if (!pending) return fail("Message not found")
  const permission = await canContactProspect(ctx,pending.prospect_id)
  if (!permission.allowed) return fail(permission.reason ?? "This prospect cannot be contacted")

  const { data, error: updateError } = await ctx.supabase
    .from("messages")
    .update({ was_sent: true, sent_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single()

  if (updateError) return fail(updateError.message)

  //also bump the parent prospect's last_contacted_at
  if (data) {
    await ctx.supabase
      .from("prospects")
      .update({ last_contacted_at: new Date().toISOString() })
      .eq("id", data.prospect_id)

    void logActivity({
      orgId: (data as Message).org_id,
      prospectId: (data as Message).prospect_id,
      userId: ctx.userId,
      action: "outreach_sent",
      newValue: (data as Message).message_type,
    })
  }

  revalidatePath("/prospects", "layout")
  revalidatePath("/pipeline")
  revalidatePath("/messages")
  return ok(data as Message)
}

export async function getMessagesForProspect(
  prospectId: string,
): Promise<ActionResult<Message[]>> {
  const { supabase, user } = await getAuthedClient()
  if (!user) return fail("Not authenticated")

  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("prospect_id", prospectId)
    .order("created_at", { ascending: false })

  if (error) return fail(error.message)
  return ok((data ?? []) as Message[])
}

export async function getAllMessages(): Promise<
  ActionResult<MessageWithProspect[]>
> {
  const { supabase, user } = await getAuthedClient()
  if (!user) return fail("Not authenticated")

  const { data, error } = await supabase
    .from("messages")
    .select("*, prospect:prospects (*)")
    .order("created_at", { ascending: false })

  if (error) return fail(error.message)
  return ok((data ?? []) as MessageWithProspect[])
}

export async function deleteMessage(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  const { supabase, user } = await getAuthedClient()
  if (!user) return fail("Not authenticated")

  const { error } = await supabase.from("messages").delete().eq("id", id)
  if (error) return fail(error.message)

  revalidatePath("/messages")
  revalidatePath("/prospects", "layout")
  return ok({ id })
}
