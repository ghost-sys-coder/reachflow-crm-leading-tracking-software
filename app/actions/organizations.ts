"use server"

import { revalidatePath } from "next/cache"

import { getAuthedOrgClient } from "@/lib/auth/org"
import { fail, ok, zodErrorMessage } from "@/lib/validation/result"
import { orgUpdateSchema, type OrgUpdateInput } from "@/lib/validation/schemas"
import type { ActionResult, Organization, OrganizationMember } from "@/types/database"

export async function getOrgMembers(): Promise<ActionResult<OrganizationMember[]>> {
  const ctx = await getAuthedOrgClient()
  if (!ctx) return fail("Not authenticated")

  const { data, error } = await ctx.supabase
    .from("organization_members")
    .select("*")
    .eq("org_id", ctx.orgId)
    .order("created_at", { ascending: true })

  if (error) return fail(error.message)
  return ok((data ?? []) as OrganizationMember[])
}

export async function updateOrg(
  input: OrgUpdateInput,
): Promise<ActionResult<Organization>> {
  const parsed = orgUpdateSchema.safeParse(input)
  if (!parsed.success) return fail(zodErrorMessage(parsed.error))

  const ctx = await getAuthedOrgClient()
  if (!ctx) return fail("Not authenticated")
  if (ctx.role !== "admin") return fail("Only admins can update org settings")

  const payload: Record<string, unknown> = {
    agency_name: parsed.data.agency_name ?? null,
    sender_name: parsed.data.sender_name ?? null,
    agency_website: parsed.data.agency_website ?? null,
    agency_value_props: parsed.data.agency_value_props ?? null,
    agency_services: parsed.data.agency_services ?? null,
  }

  const { data, error } = await ctx.supabase
    .from("organizations")
    .update(payload)
    .eq("id", ctx.orgId)
    .select()
    .single()

  if (error) return fail(error.message)
  revalidatePath("/settings")
  return ok(data as Organization)
}
