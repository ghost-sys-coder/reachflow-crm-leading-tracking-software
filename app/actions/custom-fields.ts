"use server"

import { revalidatePath } from "next/cache"

import { createAdminClient } from "@/lib/supabase/admin"
import { getAuthedOrgClient } from "@/lib/auth/org"
import { fail, ok } from "@/lib/validation/result"
import { z } from "zod"
import type { ActionResult, CustomFieldDefinition, CustomFieldValue } from "@/types/database"

export type CustomFieldItem = { id: string; name: string }
export type CustomFieldType = "text" | "number" | "date" | "boolean" | "single_select" | "url" | "currency"

const definitionSchema = z.object({
  name: z.string().trim().min(1).max(100),
  field_type: z.enum(["text", "number", "date", "boolean", "single_select", "url", "currency"]),
  help_text: z.string().trim().max(300).optional(),
  options: z.array(z.string().trim().min(1).max(100)).max(100).default([]),
  is_required: z.boolean().default(false),
})

function validateFieldValue(definition: CustomFieldDefinition, value: unknown) {
  if (value === null || value === "") return definition.is_required ? "This field is required" : null
  if (["number", "currency"].includes(definition.field_type) && (typeof value !== "number" || !Number.isFinite(value))) return "Enter a valid number"
  if (definition.field_type === "boolean" && typeof value !== "boolean") return "Enter a valid boolean"
  if (definition.field_type === "date" && (typeof value !== "string" || Number.isNaN(Date.parse(value)))) return "Enter a valid date"
  if (definition.field_type === "url" && (typeof value !== "string" || !z.url().safeParse(value).success)) return "Enter a valid URL"
  if (definition.field_type === "single_select" && (typeof value !== "string" || !(definition.options as string[]).includes(value))) return "Choose a valid option"
  if (["text", "url", "date", "single_select"].includes(definition.field_type) && typeof value !== "string") return "Enter a valid value"
  return null
}

export async function getCustomFieldDefinitions(includeArchived = false): Promise<ActionResult<CustomFieldDefinition[]>> {
  const { ctx, error } = await getAuthedOrgClient(); if (!ctx) return fail(error)
  let query = ctx.supabase.from("custom_field_definitions").select("*").eq("org_id", ctx.orgId)
  if (!includeArchived) query = query.eq("is_archived", false)
  const { data, error: dbError } = await query.order("display_order").order("created_at")
  return dbError ? fail(dbError.message) : ok((data ?? []) as CustomFieldDefinition[])
}

export async function createCustomFieldDefinition(input: z.infer<typeof definitionSchema>): Promise<ActionResult<CustomFieldDefinition>> {
  const parsed = definitionSchema.safeParse(input); if (!parsed.success) return fail(parsed.error.issues[0].message)
  if (parsed.data.field_type === "single_select" && !parsed.data.options.length) return fail("Select fields need at least one option")
  const { ctx, error } = await getAuthedOrgClient(); if (!ctx) return fail(error); if (ctx.role !== "admin") return fail("Only admins can manage field definitions")
  const { count } = await ctx.supabase.from("custom_field_definitions").select("id", { count: "exact", head: true }).eq("org_id", ctx.orgId)
  const { data, error: dbError } = await ctx.supabase.from("custom_field_definitions").insert({ ...parsed.data, org_id: ctx.orgId, display_order: count ?? 0 }).select().single()
  if (dbError) return fail(dbError.code === "23505" ? "A field with that name already exists" : dbError.message)
  revalidatePath("/settings"); revalidatePath("/prospects", "layout"); return ok(data as CustomFieldDefinition)
}

export async function archiveCustomFieldDefinition(id: string, archived = true): Promise<ActionResult<CustomFieldDefinition>> {
  const { ctx, error } = await getAuthedOrgClient(); if (!ctx) return fail(error); if (ctx.role !== "admin") return fail("Only admins can manage field definitions")
  const { data, error: dbError } = await ctx.supabase.from("custom_field_definitions").update({ is_archived: archived, updated_at: new Date().toISOString() }).eq("id", id).eq("org_id", ctx.orgId).select().single()
  if (dbError) return fail(dbError.message); revalidatePath("/settings"); return ok(data as CustomFieldDefinition)
}

export async function getProspectCustomFieldValues(prospectId: string): Promise<ActionResult<CustomFieldValue[]>> {
  const { ctx, error } = await getAuthedOrgClient(); if (!ctx) return fail(error)
  const { data, error: dbError } = await ctx.supabase.from("custom_field_values").select("*").eq("org_id", ctx.orgId).eq("prospect_id", prospectId)
  return dbError ? fail(dbError.message) : ok((data ?? []) as CustomFieldValue[])
}

export async function setProspectCustomFieldValue(prospectId: string, definitionId: string, value: unknown): Promise<ActionResult<CustomFieldValue | null>> {
  const ids = z.object({ prospectId: z.string().uuid(), definitionId: z.string().uuid() }).safeParse({ prospectId, definitionId }); if (!ids.success) return fail("Invalid field")
  const { ctx, error } = await getAuthedOrgClient(); if (!ctx) return fail(error); if (ctx.role === "viewer") return fail("Insufficient permissions")
  const { data: definition, error: definitionError } = await ctx.supabase.from("custom_field_definitions").select("*").eq("id", definitionId).eq("org_id", ctx.orgId).eq("is_archived", false).single()
  if (definitionError) return fail(definitionError.message)
  const validationError = validateFieldValue(definition as CustomFieldDefinition, value); if (validationError) return fail(validationError)
  if (value === null || value === "") { const { error: deleteError } = await ctx.supabase.from("custom_field_values").delete().eq("prospect_id", prospectId).eq("definition_id", definitionId).eq("org_id", ctx.orgId); if (deleteError) return fail(deleteError.message); return ok(null) }
  const { data, error: dbError } = await ctx.supabase.from("custom_field_values").upsert({ org_id: ctx.orgId, prospect_id: prospectId, definition_id: definitionId, value, updated_at: new Date().toISOString() }, { onConflict: "prospect_id,definition_id" }).select().single()
  if (dbError) return fail(dbError.message); revalidatePath("/prospects", "layout"); return ok(data as CustomFieldValue)
}

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
