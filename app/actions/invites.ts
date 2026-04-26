"use server"

import { randomBytes } from "crypto"
import { revalidatePath } from "next/cache"

import { getAuthedOrgClient } from "@/lib/auth/org"
import { fail, ok } from "@/lib/validation/result"
import type { ActionResult, MemberRole, OrganizationInvite } from "@/types/database"

export async function getInvites(): Promise<ActionResult<OrganizationInvite[]>> {
  const ctx = await getAuthedOrgClient()
  if (!ctx) return fail("Not authenticated")
  if (ctx.role !== "admin") return fail("Only admins can view invites")

  const { data, error } = await ctx.supabase
    .from("organization_invites")
    .select("*")
    .eq("org_id", ctx.orgId)
    .order("created_at", { ascending: false })

  if (error) return fail(error.message)
  return ok((data ?? []) as OrganizationInvite[])
}

export async function createInvite(
  email: string,
  role: MemberRole,
): Promise<ActionResult<OrganizationInvite>> {
  const ctx = await getAuthedOrgClient()
  if (!ctx) return fail("Not authenticated")
  if (ctx.role !== "admin") return fail("Only admins can invite members")

  const token = randomBytes(32).toString("hex")
  const expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await ctx.supabase
    .from("organization_invites")
    .insert({
      org_id: ctx.orgId,
      email,
      role,
      token,
      expires_at,
      created_by: ctx.userId,
    })
    .select()
    .single()

  if (error) return fail(error.message)
  revalidatePath("/settings")
  return ok(data as OrganizationInvite)
}

export async function revokeInvite(
  inviteId: string,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await getAuthedOrgClient()
  if (!ctx) return fail("Not authenticated")
  if (ctx.role !== "admin") return fail("Only admins can revoke invites")

  const { error } = await ctx.supabase
    .from("organization_invites")
    .delete()
    .eq("id", inviteId)
    .eq("org_id", ctx.orgId)

  if (error) return fail(error.message)
  revalidatePath("/settings")
  return ok({ id: inviteId })
}
