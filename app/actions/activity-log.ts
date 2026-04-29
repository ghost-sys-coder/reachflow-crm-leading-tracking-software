"use server"

import { getAuthedOrgClient } from "@/lib/auth/org"
import { fail, ok } from "@/lib/validation/result"
import type { ActionResult, ActivityLog } from "@/types/database"

export async function getActivityLog(
  prospectId: string,
): Promise<ActionResult<ActivityLog[]>> {
  const { ctx, error } = await getAuthedOrgClient()
  if (!ctx) return fail(error)

  const { data, error: dbError } = await ctx.supabase
    .from("activity_log")
    .select("*")
    .eq("prospect_id", prospectId)
    .eq("org_id", ctx.orgId)
    .order("created_at", { ascending: false })
    .limit(50)

  if (dbError) return fail(dbError.message)
  return ok((data ?? []) as ActivityLog[])
}

export type OrgActivityEntry = ActivityLog & {
  prospect: { id: string; business_name: string } | null
}

export async function getOrgActivityLog(): Promise<
  ActionResult<{ entries: OrgActivityEntry[]; isAdmin: boolean }>
> {
  const { ctx, error } = await getAuthedOrgClient()
  if (!ctx) return fail(error)

  if (ctx.role !== "admin") {
    return ok({ entries: [], isAdmin: false })
  }

  const { data, error: dbError } = await ctx.supabase
    .from("activity_log")
    .select("*, prospect:prospects!prospect_id(id, business_name)")
    .eq("org_id", ctx.orgId)
    .order("created_at", { ascending: false })
    .limit(200)

  if (dbError) return fail(dbError.message)
  return ok({ entries: (data ?? []) as OrgActivityEntry[], isAdmin: true })
}
