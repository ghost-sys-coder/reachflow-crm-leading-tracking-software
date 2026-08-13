"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { getAuthedOrgClient } from "@/lib/auth/org"
import { fail, ok, zodErrorMessage } from "@/lib/validation/result"
import type { ActionResult, Prospect, SavedView, Task } from "@/types/database"

const taskSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
  assigned_to: z.string().uuid().nullable().optional(),
  prospect_id: z.string().uuid().nullable().optional(),
  campaign_id: z.string().uuid().nullable().optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  due_at: z.coerce.date().nullable().optional(),
})

const savedViewSchema = z.object({
  name: z.string().trim().min(1).max(100),
  scope: z.enum(["private", "shared"]),
  entity_type: z.enum(["prospects", "pipeline"]).default("prospects"),
  filters: z.object({ status: z.string().max(30).optional(), platform: z.string().max(50).optional(), q: z.string().max(200).optional(), assigned: z.literal("me").optional() }),
})

export type TodayProspect = Prospect & { queue_reason: "overdue" | "today" | "stale" }

export async function getTodayQueue(): Promise<ActionResult<TodayProspect[]>> {
  const { ctx, error } = await getAuthedOrgClient()
  if (!ctx) return fail(error)
  const now = new Date()
  const end = new Date(now); end.setHours(23, 59, 59, 999)
  const stale = new Date(now.getTime() - 7 * 86_400_000)
  let query = ctx.supabase.from("prospects").select("*").eq("org_id", ctx.orgId).not("status", "in", "(closed,dead)").or(`snoozed_until.is.null,snoozed_until.lte.${now.toISOString()}`)
  if (ctx.role !== "admin") query = query.or(`assigned_to.eq.${ctx.userId},assigned_to.is.null`)
  const { data, error: queryError } = await query.order("follow_up_at", { ascending: true, nullsFirst: false })
  if (queryError) return fail(queryError.message)
  const queue = (data ?? []).flatMap((prospect) => {
    const due = prospect.follow_up_at ? new Date(prospect.follow_up_at) : null
    const last = prospect.last_contacted_at ? new Date(prospect.last_contacted_at) : new Date(prospect.created_at)
    const reason = due && due < now ? "overdue" : due && due <= end ? "today" : last < stale ? "stale" : null
    return reason ? [{ ...prospect, queue_reason: reason } as TodayProspect] : []
  })
  return ok(queue.sort((a, b) => ({ overdue: 0, today: 1, stale: 2 }[a.queue_reason] - { overdue: 0, today: 1, stale: 2 }[b.queue_reason])))
}

export async function snoozeProspect(prospectId: string, days: number, reason: string): Promise<ActionResult<{ done: true }>> {
  const parsed = z.object({ prospectId: z.string().uuid(), days: z.number().int().min(1).max(365), reason: z.string().trim().min(1).max(300) }).safeParse({ prospectId, days, reason })
  if (!parsed.success) return fail(zodErrorMessage(parsed.error))
  const { ctx, error } = await getAuthedOrgClient(); if (!ctx) return fail(error); if (ctx.role === "viewer") return fail("Insufficient permissions")
  const until = new Date(); until.setDate(until.getDate() + parsed.data.days)
  const { error: updateError } = await ctx.supabase.from("prospects").update({ snoozed_until: until.toISOString(), snooze_reason: parsed.data.reason }).eq("id", parsed.data.prospectId).eq("org_id", ctx.orgId)
  if (updateError) return fail(updateError.message)
  revalidatePath("/today"); return ok({ done: true })
}

export async function getTasks(): Promise<ActionResult<Task[]>> {
  const { ctx, error } = await getAuthedOrgClient(); if (!ctx) return fail(error)
  const { data, error: queryError } = await ctx.supabase.from("tasks").select("*").eq("org_id", ctx.orgId).order("due_at", { ascending: true, nullsFirst: false })
  return queryError ? fail(queryError.message) : ok((data ?? []) as Task[])
}

export async function createTask(input: z.infer<typeof taskSchema>): Promise<ActionResult<Task>> {
  const parsed = taskSchema.safeParse(input); if (!parsed.success) return fail(zodErrorMessage(parsed.error))
  const { ctx, error } = await getAuthedOrgClient(); if (!ctx) return fail(error); if (ctx.role === "viewer") return fail("Insufficient permissions")
  const { data, error: insertError } = await ctx.supabase.from("tasks").insert({ ...parsed.data, due_at: parsed.data.due_at?.toISOString() ?? null, org_id: ctx.orgId, created_by: ctx.userId }).select().single()
  if (insertError) return fail(insertError.message); revalidatePath("/tasks"); revalidatePath("/today"); return ok(data as Task)
}

export async function setTaskCompleted(id: string, completed: boolean): Promise<ActionResult<Task>> {
  const parsed = z.string().uuid().safeParse(id); if (!parsed.success) return fail("Invalid task")
  const { ctx, error } = await getAuthedOrgClient(); if (!ctx) return fail(error); if (ctx.role === "viewer") return fail("Insufficient permissions")
  const { data, error: updateError } = await ctx.supabase.from("tasks").update({ status: completed ? "completed" : "open", completed_at: completed ? new Date().toISOString() : null, updated_at: new Date().toISOString() }).eq("id", id).eq("org_id", ctx.orgId).select().single()
  if (updateError) return fail(updateError.message); revalidatePath("/tasks"); revalidatePath("/today"); return ok(data as Task)
}

export async function getSavedViews(): Promise<ActionResult<SavedView[]>> {
  const { ctx, error } = await getAuthedOrgClient(); if (!ctx) return fail(error)
  const { data, error: queryError } = await ctx.supabase.from("saved_views").select("*").eq("org_id", ctx.orgId).eq("entity_type", "prospects").order("name")
  return queryError ? fail(queryError.message) : ok((data ?? []) as SavedView[])
}

export async function createSavedView(input: z.infer<typeof savedViewSchema>): Promise<ActionResult<SavedView>> {
  const parsed = savedViewSchema.safeParse(input); if (!parsed.success) return fail(zodErrorMessage(parsed.error))
  const { ctx, error } = await getAuthedOrgClient(); if (!ctx) return fail(error); if (ctx.role === "viewer") return fail("Insufficient permissions")
  const { data, error: insertError } = await ctx.supabase.from("saved_views").insert({ org_id: ctx.orgId, owner_id: ctx.userId, name: parsed.data.name, scope: parsed.data.scope, entity_type: parsed.data.entity_type, filter_json: parsed.data.filters }).select().single()
  if (insertError) return fail(insertError.message); revalidatePath("/prospects"); return ok(data as SavedView)
}

export async function deleteSavedView(id: string): Promise<ActionResult<{ id: string }>> {
  const { ctx, error } = await getAuthedOrgClient(); if (!ctx) return fail(error)
  const { error: deleteError } = await ctx.supabase.from("saved_views").delete().eq("id", id).eq("org_id", ctx.orgId)
  if (deleteError) return fail(deleteError.message); revalidatePath("/prospects"); return ok({ id })
}
