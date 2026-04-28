"use server"

import { revalidatePath } from "next/cache"

import { getAuthedOrgClient } from "@/lib/auth/org"
import { fail, ok, zodErrorMessage } from "@/lib/validation/result"
import {
  templateCreateSchema,
  templateUpdateSchema,
  type TemplateCreateInput,
  type TemplateUpdateInput,
} from "@/lib/validation/schemas"
import type { ActionResult, MessageTemplate } from "@/types/database"

export type TemplatesPayload = {
  templates: MessageTemplate[]
  orgVars: { agency_name: string | null; sender_name: string | null }
}

export async function getTemplates(): Promise<ActionResult<TemplatesPayload>> {
  const { ctx, error } = await getAuthedOrgClient()
  if (!ctx) return fail(error)

  const [templatesRes, orgRes] = await Promise.all([
    ctx.supabase
      .from("message_templates")
      .select("*")
      .eq("org_id", ctx.orgId)
      .order("created_at", { ascending: false }),
    ctx.supabase
      .from("organizations")
      .select("agency_name, sender_name")
      .eq("id", ctx.orgId)
      .single(),
  ])

  if (templatesRes.error) return fail(templatesRes.error.message)

  return ok({
    templates: (templatesRes.data ?? []) as MessageTemplate[],
    orgVars: {
      agency_name: orgRes.data?.agency_name ?? null,
      sender_name: orgRes.data?.sender_name ?? null,
    },
  })
}

export async function createTemplate(
  input: TemplateCreateInput,
): Promise<ActionResult<MessageTemplate>> {
  const parsed = templateCreateSchema.safeParse(input)
  if (!parsed.success) return fail(zodErrorMessage(parsed.error))

  const { ctx, error } = await getAuthedOrgClient()
  if (!ctx) return fail(error)
  if (ctx.role === "viewer") return fail("Viewers cannot create templates")

  const { data, error: insertError } = await ctx.supabase
    .from("message_templates")
    .insert({ ...parsed.data, org_id: ctx.orgId, created_by: ctx.userId })
    .select()
    .single()

  if (insertError) return fail(insertError.message)
  revalidatePath("/settings")
  return ok(data as MessageTemplate)
}

export async function updateTemplate(
  id: string,
  input: TemplateUpdateInput,
): Promise<ActionResult<MessageTemplate>> {
  const parsed = templateUpdateSchema.safeParse(input)
  if (!parsed.success) return fail(zodErrorMessage(parsed.error))

  const { ctx, error } = await getAuthedOrgClient()
  if (!ctx) return fail(error)
  if (ctx.role === "viewer") return fail("Viewers cannot edit templates")

  const { data, error: updateError } = await ctx.supabase
    .from("message_templates")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("org_id", ctx.orgId)
    .select()
    .single()

  if (updateError) return fail(updateError.message)
  revalidatePath("/settings")
  return ok(data as MessageTemplate)
}

export async function deleteTemplate(
  id: string,
): Promise<ActionResult<{ done: true }>> {
  const { ctx, error } = await getAuthedOrgClient()
  if (!ctx) return fail(error)
  if (ctx.role !== "admin") return fail("Only admins can delete templates")

  const { error: deleteError } = await ctx.supabase
    .from("message_templates")
    .delete()
    .eq("id", id)
    .eq("org_id", ctx.orgId)

  if (deleteError) return fail(deleteError.message)
  revalidatePath("/settings")
  return ok({ done: true })
}
