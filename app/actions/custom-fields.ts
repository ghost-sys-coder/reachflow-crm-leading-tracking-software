"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { getAuthedOrgClient } from "@/lib/auth/org"
import { fail, ok } from "@/lib/validation/result"
import { CUSTOM_FIELD_TYPES } from "@/db/schema"
import type { ActionResult, CustomFieldDefinition, CustomFieldValues } from "@/types/database"

const fieldDefSchema = z.object({
  name:       z.string().trim().min(1, "Name is required").max(60),
  field_type: z.enum(CUSTOM_FIELD_TYPES),
  options:    z.array(z.string().trim().min(1).max(100)).max(20).optional(),
  position:   z.number().int().min(0).optional(),
})

export type CustomFieldDefInput = z.infer<typeof fieldDefSchema>

export async function getCustomFieldDefinitions(): Promise<ActionResult<CustomFieldDefinition[]>> {
  const { ctx, error } = await getAuthedOrgClient()
  if (!ctx) return fail(error)

  const { data, error: dbError } = await ctx.supabase
    .from("custom_field_definitions")
    .select("*")
    .eq("org_id", ctx.orgId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true })

  if (dbError) return fail(dbError.message)
  return ok((data ?? []) as CustomFieldDefinition[])
}

export async function createCustomFieldDefinition(
  input: CustomFieldDefInput,
): Promise<ActionResult<CustomFieldDefinition>> {
  const parsed = fieldDefSchema.safeParse(input)
  if (!parsed.success) return fail(parsed.error.issues[0].message)

  const { ctx, error } = await getAuthedOrgClient()
  if (!ctx) return fail(error)
  if (ctx.role !== "admin") return fail("Only admins can manage custom fields")

  const { count } = await ctx.supabase
    .from("custom_field_definitions")
    .select("*", { count: "exact", head: true })
    .eq("org_id", ctx.orgId)

  const { data, error: dbError } = await ctx.supabase
    .from("custom_field_definitions")
    .insert({
      org_id:     ctx.orgId,
      name:       parsed.data.name,
      field_type: parsed.data.field_type,
      options:    parsed.data.field_type === "select" ? (parsed.data.options ?? []) : null,
      position:   count ?? 0,
    })
    .select()
    .single()

  if (dbError) return fail(dbError.message)
  revalidatePath("/settings")
  return ok(data as CustomFieldDefinition)
}

export async function updateCustomFieldDefinition(
  id: string,
  input: CustomFieldDefInput,
): Promise<ActionResult<CustomFieldDefinition>> {
  const parsed = fieldDefSchema.safeParse(input)
  if (!parsed.success) return fail(parsed.error.issues[0].message)

  const { ctx, error } = await getAuthedOrgClient()
  if (!ctx) return fail(error)
  if (ctx.role !== "admin") return fail("Only admins can manage custom fields")

  const { data, error: dbError } = await ctx.supabase
    .from("custom_field_definitions")
    .update({
      name:       parsed.data.name,
      field_type: parsed.data.field_type,
      options:    parsed.data.field_type === "select" ? (parsed.data.options ?? []) : null,
    })
    .eq("id", id)
    .eq("org_id", ctx.orgId)
    .select()
    .single()

  if (dbError) return fail(dbError.message)
  revalidatePath("/settings")
  return ok(data as CustomFieldDefinition)
}

export async function deleteCustomFieldDefinition(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  const { ctx, error } = await getAuthedOrgClient()
  if (!ctx) return fail(error)
  if (ctx.role !== "admin") return fail("Only admins can manage custom fields")

  const { error: dbError } = await ctx.supabase
    .from("custom_field_definitions")
    .delete()
    .eq("id", id)
    .eq("org_id", ctx.orgId)

  if (dbError) return fail(dbError.message)
  revalidatePath("/settings")
  return ok({ id })
}

export async function updateProspectCustomFields(
  prospectId: string,
  customFields: CustomFieldValues,
): Promise<ActionResult<{ done: true }>> {
  const { ctx, error } = await getAuthedOrgClient()
  if (!ctx) return fail(error)

  const { error: dbError } = await ctx.supabase
    .from("prospects")
    .update({ custom_fields: customFields })
    .eq("id", prospectId)
    .eq("org_id", ctx.orgId)

  if (dbError) return fail(dbError.message)
  return ok({ done: true })
}
