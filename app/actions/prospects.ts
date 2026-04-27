"use server"

import { revalidatePath } from "next/cache"

import { getAuthedClient } from "@/lib/auth/session"
import { getAuthedOrgClient } from "@/lib/auth/org"
import { fail, ok, zodErrorMessage } from "@/lib/validation/result"
import {
  PLATFORMS,
  PROSPECT_STATUSES,
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

  const { ctx, error: orgError } = await getAuthedOrgClient()
  if (!ctx) return fail(orgError)
  if (ctx.role === "viewer") return fail("Insufficient permissions")

  const { data, error: insertError } = await ctx.supabase
    .from("prospects")
    .insert({ ...parsed.data, org_id: ctx.orgId })
    .select()
    .single()

  if (insertError) return fail(insertError.message)
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

export async function assignProspect(
  prospectId: string,
  userId: string | null,
): Promise<ActionResult<{ done: true }>> {
  const { ctx, error } = await getAuthedOrgClient()
  if (!ctx) return fail(error)
  if (ctx.role !== "admin") return fail("Only admins can assign leads")

  const { error: dbError } = await ctx.supabase
    .from("prospects")
    .update({ assigned_to: userId })
    .eq("id", prospectId)
    .eq("org_id", ctx.orgId)

  if (dbError) return fail(dbError.message)
  revalidateProspectViews()
  return ok({ done: true })
}

export type CsvImportRow = {
  business_name: string
  platform: string
  handle?: string
  industry?: string
  location?: string
  website_url?: string
  status?: string
  notes?: string
}

export type ImportResult = {
  imported: number
  errors: { row: number; reason: string }[]
}

function normalizePlatform(raw: string | undefined): string {
  if (!raw) return "other"
  const v = raw.trim().toLowerCase()
  const aliases: Record<string, string> = {
    ig: "instagram", instagram: "instagram",
    fb: "facebook", facebook: "facebook",
    li: "linkedin", linkedin: "linkedin",
    tw: "twitter", twitter: "twitter",
    email: "email", mail: "email",
    other: "other",
  }
  return aliases[v] ?? "other"
}

function normalizeStatus(raw: string | undefined): string {
  if (!raw) return "sent"
  const v = raw.trim().toLowerCase()
  return (PROSPECT_STATUSES as readonly string[]).includes(v) ? v : "sent"
}

export async function importProspects(
  rows: CsvImportRow[],
): Promise<ActionResult<ImportResult>> {
  if (rows.length === 0) return fail("No rows to import")
  if (rows.length > 500) return fail("Maximum 500 rows per import")

  const { ctx, error: orgError } = await getAuthedOrgClient()
  if (!ctx) return fail(orgError)
  if (ctx.role === "viewer") return fail("Insufficient permissions")

  const errors: { row: number; reason: string }[] = []
  const valid: Array<{ org_id: string } & Record<string, unknown>> = []

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i]
    const parsed = prospectCreateSchema.safeParse({
      business_name: raw.business_name,
      platform: normalizePlatform(raw.platform),
      handle: raw.handle || undefined,
      industry: raw.industry || undefined,
      location: raw.location || undefined,
      website_url: raw.website_url || undefined,
      status: normalizeStatus(raw.status),
      notes: raw.notes || undefined,
    })
    if (!parsed.success) {
      errors.push({ row: i + 2, reason: zodErrorMessage(parsed.error) })
    } else {
      valid.push({ ...parsed.data, org_id: ctx.orgId })
    }
  }

  if (valid.length > 0) {
    const CHUNK = 100
    for (let i = 0; i < valid.length; i += CHUNK) {
      const { error: insertError } = await ctx.supabase
        .from("prospects")
        .insert(valid.slice(i, i + CHUNK))
      if (insertError) return fail(insertError.message)
    }
    revalidateProspectViews()
  }

  return ok({ imported: valid.length, errors })
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
