"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { getAuthedOrgClient } from "@/lib/auth/org"
import { canContactProspect } from "@/lib/compliance/can-contact"
import { getWhatsAppCloudConfig } from "@/lib/whatsapp/config"
import { getConfiguredWhatsAppNumber, sendWhatsAppText, subscribeConfiguredWhatsAppAccount } from "@/lib/whatsapp/client"
import { fail, ok } from "@/lib/validation/result"
import type { ActionResult, Message } from "@/types/database"

const sendSchema = z.object({ prospect_id: z.string().uuid(), content: z.string().trim().min(1).max(4096) })
export type WhatsAppConnectionSummary = { id: string; display_phone_number: string | null; status: string; last_message_at: string | null; last_error: string | null }

export async function getWhatsAppConnection(): Promise<ActionResult<WhatsAppConnectionSummary | null>> {
  const { ctx, error } = await getAuthedOrgClient()
  if (!ctx) return fail(error)
  const { data, error: dbError } = await ctx.supabase.from("whatsapp_connections").select("id,display_phone_number,status,last_message_at,last_error").eq("org_id", ctx.orgId).maybeSingle()
  if (dbError) return fail(dbError.message)
  return ok(data as WhatsAppConnectionSummary | null)
}

export async function connectConfiguredWhatsApp(): Promise<ActionResult<WhatsAppConnectionSummary>> {
  const { ctx, error } = await getAuthedOrgClient()
  if (!ctx) return fail(error)
  if (ctx.role !== "admin") return fail("Only workspace admins can connect WhatsApp")
  try {
    const config = getWhatsAppCloudConfig()
    const [number] = await Promise.all([getConfiguredWhatsAppNumber(), subscribeConfiguredWhatsAppAccount()])
    const { data, error: dbError } = await ctx.supabase.from("whatsapp_connections").upsert({
      org_id: ctx.orgId,
      connected_by: ctx.userId,
      business_account_id: config.businessAccountId,
      phone_number_id: config.phoneNumberId,
      display_phone_number: number.display_phone_number ?? null,
      status: "active",
      last_error: null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "org_id" }).select("id,display_phone_number,status,last_message_at,last_error").single()
    if (dbError) return fail(dbError.message)
    revalidatePath("/settings")
    return ok(data as WhatsAppConnectionSummary)
  } catch (cause) {
    return fail(cause instanceof Error ? cause.message : "Could not connect WhatsApp")
  }
}

export async function disconnectWhatsApp(): Promise<ActionResult<{ disconnected: true }>> {
  const { ctx, error } = await getAuthedOrgClient()
  if (!ctx) return fail(error)
  if (ctx.role !== "admin") return fail("Only workspace admins can disconnect WhatsApp")
  const { error: dbError } = await ctx.supabase.from("whatsapp_connections").delete().eq("org_id", ctx.orgId)
  if (dbError) return fail(dbError.message)
  revalidatePath("/settings")
  return ok({ disconnected: true })
}

export async function sendWhatsAppOutreach(input: z.infer<typeof sendSchema>): Promise<ActionResult<Message>> {
  const parsed = sendSchema.safeParse(input)
  if (!parsed.success) return fail(parsed.error.issues[0].message)
  const { ctx, error } = await getAuthedOrgClient()
  if (!ctx) return fail(error)
  if (ctx.role === "viewer") return fail("Insufficient permissions")
  const permission = await canContactProspect(ctx, parsed.data.prospect_id)
  if (!permission.allowed) return fail(permission.reason ?? "This prospect cannot be contacted")

  const { data: connection } = await ctx.supabase.from("whatsapp_connections").select("id").eq("org_id", ctx.orgId).eq("status", "active").maybeSingle()
  if (!connection) return fail("Connect WhatsApp in Settings before sending")
  const { data: prospect } = await ctx.supabase.from("prospects").select("phone_number").eq("id", parsed.data.prospect_id).eq("org_id", ctx.orgId).maybeSingle()
  const to = prospect?.phone_number?.replace(/\D/g, "").replace(/^00/, "")
  if (!to || to.length < 8) return fail("Add a valid international phone number to this prospect")

  const { data: message, error: insertError } = await ctx.supabase.from("messages").insert({ org_id: ctx.orgId, prospect_id: parsed.data.prospect_id, user_id: ctx.userId, message_type: "whatsapp_message", content: parsed.data.content, direction: "outbound", provider: "whatsapp", was_sent: false, delivery_status: "pending" }).select().single()
  if (insertError) return fail(insertError.message)
  try {
    const result = await sendWhatsAppText(to, parsed.data.content)
    const providerMessageId = result.messages?.[0]?.id
    if (!providerMessageId) throw new Error("Meta did not return a WhatsApp message ID")
    const sentAt = new Date().toISOString()
    const { data: updated } = await ctx.supabase.from("messages").update({ was_sent: true, sent_at: sentAt, recorded_at: sentAt, provider_message_id: providerMessageId, provider_thread_id: to, delivery_status: "sent" }).eq("id", message.id).eq("org_id", ctx.orgId).select().single()
    await ctx.supabase.from("prospects").update({ last_contacted_at: sentAt }).eq("id", parsed.data.prospect_id).eq("org_id", ctx.orgId)
    await ctx.supabase.from("whatsapp_connections").update({ last_message_at: sentAt, last_error: null, updated_at: sentAt }).eq("id", connection.id)
    revalidatePath("/prospects", "layout"); revalidatePath("/pipeline"); revalidatePath("/messages")
    return ok(updated as Message)
  } catch (cause) {
    const reason = cause instanceof Error ? cause.message : "WhatsApp delivery failed"
    await ctx.supabase.from("messages").update({ delivery_status: "failed" }).eq("id", message.id)
    await ctx.supabase.from("whatsapp_connections").update({ last_error: reason, updated_at: new Date().toISOString() }).eq("id", connection.id)
    return fail(reason)
  }
}
