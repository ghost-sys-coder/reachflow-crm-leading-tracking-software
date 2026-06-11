"use server"

import { revalidatePath } from "next/cache"

import { createAdminClient } from "@/lib/supabase/admin"
import { getAuthedOrgClient } from "@/lib/auth/org"
import { fail, ok } from "@/lib/validation/result"
import type { ActionResult } from "@/types/database"

export type CustomFieldItem = { id: string; name: string }

// ---------------------------------------------------------------------------
// Industries
// ---------------------------------------------------------------------------

export async function getOrgIndustries(): Promise<ActionResult<CustomFieldItem[]>> {
  const { ctx, error } = await getAuthedOrgClient()
  if (!ctx) return fail(error)

  const admin = await createAdminClient()
  const { data, error: dbError } = await admin
    .from("org_industries")
    .select("id, name")
    .eq("org_id", ctx.orgId)
    .order("name", { ascending: true })

  if (dbError) return fail(dbError.message)
  return ok((data ?? []) as CustomFieldItem[])
}

export async function createOrgIndustry(name: string): Promise<ActionResult<CustomFieldItem>> {
  const trimmed = name.trim()
  if (!trimmed) return fail("Name is required")
  if (trimmed.length > 100) return fail("Name must be 100 characters or fewer")

  const { ctx, error } = await getAuthedOrgClient()
  if (!ctx) return fail(error)
  if (ctx.role !== "admin") return fail("Only admins can manage industries")

  const admin = await createAdminClient()
  const { data, error: dbError } = await admin
    .from("org_industries")
    .insert({ org_id: ctx.orgId, name: trimmed })
    .select("id, name")
    .single()

  if (dbError) {
    if (dbError.code === "23505") return fail(`"${trimmed}" already exists`)
    return fail(dbError.message)
  }
  revalidatePath("/settings")
  return ok(data as CustomFieldItem)
}

export async function deleteOrgIndustry(id: string): Promise<ActionResult<{ done: true }>> {
  const { ctx, error } = await getAuthedOrgClient()
  if (!ctx) return fail(error)
  if (ctx.role !== "admin") return fail("Only admins can manage industries")

  const admin = await createAdminClient()
  const { error: dbError } = await admin
    .from("org_industries")
    .delete()
    .eq("id", id)
    .eq("org_id", ctx.orgId)

  if (dbError) return fail(dbError.message)
  revalidatePath("/settings")
  return ok({ done: true })
}

// ---------------------------------------------------------------------------
// Custom platforms
// ---------------------------------------------------------------------------

export async function getOrgCustomPlatforms(): Promise<ActionResult<CustomFieldItem[]>> {
  const { ctx, error } = await getAuthedOrgClient()
  if (!ctx) return fail(error)

  const admin = await createAdminClient()
  const { data, error: dbError } = await admin
    .from("org_custom_platforms")
    .select("id, name")
    .eq("org_id", ctx.orgId)
    .order("name", { ascending: true })

  if (dbError) return fail(dbError.message)
  return ok((data ?? []) as CustomFieldItem[])
}

export async function createOrgCustomPlatform(name: string): Promise<ActionResult<CustomFieldItem>> {
  const trimmed = name.trim()
  if (!trimmed) return fail("Name is required")
  if (trimmed.length > 50) return fail("Name must be 50 characters or fewer")

  const { ctx, error } = await getAuthedOrgClient()
  if (!ctx) return fail(error)
  if (ctx.role !== "admin") return fail("Only admins can manage platforms")

  const admin = await createAdminClient()
  const { data, error: dbError } = await admin
    .from("org_custom_platforms")
    .insert({ org_id: ctx.orgId, name: trimmed })
    .select("id, name")
    .single()

  if (dbError) {
    if (dbError.code === "23505") return fail(`"${trimmed}" already exists`)
    return fail(dbError.message)
  }
  revalidatePath("/settings")
  return ok(data as CustomFieldItem)
}

export async function deleteOrgCustomPlatform(id: string): Promise<ActionResult<{ done: true }>> {
  const { ctx, error } = await getAuthedOrgClient()
  if (!ctx) return fail(error)
  if (ctx.role !== "admin") return fail("Only admins can manage platforms")

  const admin = await createAdminClient()
  const { error: dbError } = await admin
    .from("org_custom_platforms")
    .delete()
    .eq("id", id)
    .eq("org_id", ctx.orgId)

  if (dbError) return fail(dbError.message)
  revalidatePath("/settings")
  return ok({ done: true })
}
