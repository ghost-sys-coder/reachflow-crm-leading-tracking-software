"use server"

import { revalidatePath } from "next/cache"

import { createAdminClient } from "@/lib/supabase/admin"
import { getAuthedOrgClient } from "@/lib/auth/org"
import { fail, ok } from "@/lib/validation/result"
import type { ActionResult, Notification, NotificationType } from "@/types/database"

export async function getNotifications(): Promise<ActionResult<Notification[]>> {
  const { ctx, error } = await getAuthedOrgClient()
  if (!ctx) return fail(error)

  const { data, error: dbError } = await ctx.supabase
    .from("notifications")
    .select("*")
    .eq("user_id", ctx.userId)
    .order("created_at", { ascending: false })
    .limit(30)

  if (dbError) return fail(dbError.message)
  return ok((data ?? []) as Notification[])
}

export async function getUnreadCount(): Promise<ActionResult<number>> {
  const { ctx, error } = await getAuthedOrgClient()
  if (!ctx) return fail(error)

  const { count, error: dbError } = await ctx.supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", ctx.userId)
    .is("read_at", null)

  if (dbError) return fail(dbError.message)
  return ok(count ?? 0)
}

export async function markAsRead(id: string): Promise<ActionResult<{ done: true }>> {
  const { ctx, error } = await getAuthedOrgClient()
  if (!ctx) return fail(error)

  const { error: dbError } = await ctx.supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", ctx.userId)

  if (dbError) return fail(dbError.message)
  return ok({ done: true })
}

export async function markAllAsRead(): Promise<ActionResult<{ done: true }>> {
  const { ctx, error } = await getAuthedOrgClient()
  if (!ctx) return fail(error)

  const { error: dbError } = await ctx.supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", ctx.userId)
    .is("read_at", null)

  if (dbError) return fail(dbError.message)
  revalidatePath("/", "layout")
  return ok({ done: true })
}

// Internal helper — called from other server actions via the admin client.
// Uses service role to insert notifications for other users (bypasses RLS).
export async function createNotification(params: {
  orgId: string
  userId: string
  actorId: string
  type: NotificationType
  subjectId?: string
  message: string
}): Promise<void> {
  try {
    const admin = createAdminClient()
    await admin.from("notifications").insert({
      org_id: params.orgId,
      user_id: params.userId,
      actor_id: params.actorId,
      type: params.type,
      subject_id: params.subjectId ?? null,
      message: params.message,
    })
  } catch {
    // notification failures must never break the parent action
  }
}
