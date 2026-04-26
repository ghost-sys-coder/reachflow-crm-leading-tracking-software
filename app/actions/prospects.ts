"use server"

import { revalidatePath } from "next/cache"

import { getAuthedClient } from "@/lib/auth/session"
import { getAuthedOrgClient } from "@/lib/auth/org"
import { fail, ok, zodErrorMessage } from "@/lib/validation/result"
import {
  prospectCreateSchema,
  prospectStatusUpdateSchema,
  prospectUpdateSchema,
  type ProspectCreateInput,
  type ProspectStatusUpdateInput,
  type ProspectUpdateInput,
} from "@/lib/validation/schemas"
import type {
  ActionResult,
  Prospect,
  ProspectFilters,
  ProspectWithDetail,
  Tag,
} from "@/types/database"

function revalidateProspectViews() {
  revalidatePath("/pipeline")
  revalidatePath("/prospects", "layout")
}

export async function createProspect(
  input: ProspectCreateInput,
): Promise<ActionResult<Prospect>> {
  const parsed = prospectCreateSchema.safeParse(input)
  if (!parsed.success) return fail(zodErrorMessage(parsed.error))

  const { ctx, error } = await getAuthedOrgClient()
  if (!ctx) return fail(error)
  if (ctx.role === "viewer") return fail("Insufficient permissions")

  const { data, error } = await ctx.supabase
    .from("prospects")
    .insert({ ...parsed.data, org_id: ctx.orgId })
    .select()
    .single()

  if (error) return fail(error.message)
  revalidateProspectViews()
  return ok(data as Prospect)
}

export async function updateProspect(
  id: string,
  input: ProspectUpdateInput,
): Promise<ActionResult<Prospect>> {
  const parsed = prospectUpdateSchema.safeParse(input)
  if (!parsed.success) return fail(zodErrorMessage(parsed.error))

  const { supabase, user } = await getAuthedClient()
  if (!user) return fail("Not authenticated")

  const { data, error } = await supabase
    .from("prospects")
    .update(parsed.data)
    .eq("id", id)
    .select()
    .single()

  if (error) return fail(error.message)
  revalidateProspectViews()
  return ok(data as Prospect)
}

export async function updateProspectStatus(
  id: string,
  input: ProspectStatusUpdateInput,
): Promise<ActionResult<Prospect>> {
  const parsed = prospectStatusUpdateSchema.safeParse(input)
  if (!parsed.success) return fail(zodErrorMessage(parsed.error))

  const { supabase, user } = await getAuthedClient()
  if (!user) return fail("Not authenticated")

  const { data, error } = await supabase
    .from("prospects")
    .update({ status: parsed.data.status })
    .eq("id", id)
    .select()
    .single()

  if (error) return fail(error.message)
  revalidateProspectViews()
  return ok(data as Prospect)
}

export async function deleteProspect(id: string): Promise<ActionResult<{ id: string }>> {
  const { supabase, user } = await getAuthedClient()
  if (!user) return fail("Not authenticated")

  const { error } = await supabase.from("prospects").delete().eq("id", id)
  if (error) return fail(error.message)

  revalidateProspectViews()
  return ok({ id })
}

export async function getProspects(
  filters: ProspectFilters = {},
): Promise<ActionResult<Prospect[]>> {
  const { supabase, user } = await getAuthedClient()
  if (!user) return fail("Not authenticated")

  let query = supabase
    .from("prospects")
    .select("*")
    .order("created_at", { ascending: false })

  if (filters.status) query = query.eq("status", filters.status)
  if (filters.platform) query = query.eq("platform", filters.platform)
  if (filters.search) {
    const term = `%${filters.search}%`
    query = query.or(
      `business_name.ilike.${term},handle.ilike.${term},industry.ilike.${term},location.ilike.${term}`,
    )
  }

  const { data, error } = await query
  if (error) return fail(error.message)
  return ok((data ?? []) as Prospect[])
}

export async function getProspectById(
  id: string,
): Promise<ActionResult<ProspectWithDetail | null>> {
  const { supabase, user } = await getAuthedClient()
  if (!user) return fail("Not authenticated")

  const { data, error } = await supabase
    .from("prospects")
    .select(
      `
      *,
      messages (*),
      prospect_tags (
        tag:tags (*)
      )
      `,
    )
    .eq("id", id)
    .maybeSingle()

  if (error) return fail(error.message)
  if (!data) return ok(null)

  type ProspectTagJoin = { tag: Tag | null }
  const { prospect_tags, ...rest } = data as typeof data & {
    prospect_tags: ProspectTagJoin[] | null
  }

  const tags: Tag[] = []
  for (const row of prospect_tags ?? []) {
    if (row.tag) tags.push(row.tag)
  }

  return ok({ ...rest, tags } as ProspectWithDetail)
}
