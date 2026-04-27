"use server"

import { revalidatePath } from "next/cache"

import { getAuthedOrgClient } from "@/lib/auth/org"
import { fail, ok, zodErrorMessage } from "@/lib/validation/result"
import {
  inviteCreateSchema,
  memberRoleUpdateSchema,
  type InviteCreateInput,
} from "@/lib/validation/schemas"
import type { ActionResult, OrganizationInvite, TeamMember } from "@/types/database"
import type { MemberRole } from "@/types/database"

export async function getTeamMembers(): Promise<ActionResult<TeamMember[]>> {
  const { ctx, error } = await getAuthedOrgClient()
  if (!ctx) return fail(error)

  const { data, error: rpcError } = await ctx.supabase
    .rpc("get_org_members_with_profiles", { p_org_id: ctx.orgId })

  if (rpcError) return fail(rpcError.message)
  return ok((data ?? []) as TeamMember[])
}

export async function getPendingInvites(): Promise<ActionResult<OrganizationInvite[]>> {
  const { ctx, error } = await getAuthedOrgClient()
  if (!ctx) return fail(error)
  if (ctx.role !== "admin") return ok([])

  const { data, error: dbError } = await ctx.supabase
    .from("organization_invites")
    .select("*")
    .eq("org_id", ctx.orgId)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })

  if (dbError) return fail(dbError.message)
  return ok((data ?? []) as OrganizationInvite[])
}

export async function createInvite(
  input: InviteCreateInput,
): Promise<ActionResult<{ token: string }>> {
  const parsed = inviteCreateSchema.safeParse(input)
  if (!parsed.success) return fail(zodErrorMessage(parsed.error))

  const { ctx, error } = await getAuthedOrgClient()
  if (!ctx) return fail(error)
  if (ctx.role !== "admin") return fail("Only admins can invite team members")

  const token = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const { error: dbError } = await ctx.supabase
    .from("organization_invites")
    .insert({
      org_id: ctx.orgId,
      email: parsed.data.email,
      role: parsed.data.role,
      token,
      expires_at: expiresAt,
      created_by: ctx.userId,
    })

  if (dbError) return fail(dbError.message)
  revalidatePath("/settings")
  return ok({ token })
}

export async function cancelInvite(
  inviteId: string,
): Promise<ActionResult<{ done: true }>> {
  const { ctx, error } = await getAuthedOrgClient()
  if (!ctx) return fail(error)
  if (ctx.role !== "admin") return fail("Only admins can cancel invites")

  const { error: dbError } = await ctx.supabase
    .from("organization_invites")
    .delete()
    .eq("id", inviteId)
    .eq("org_id", ctx.orgId)

  if (dbError) return fail(dbError.message)
  revalidatePath("/settings")
  return ok({ done: true })
}

export async function removeMember(
  memberId: string,
): Promise<ActionResult<{ done: true }>> {
  const { ctx, error } = await getAuthedOrgClient()
  if (!ctx) return fail(error)
  if (ctx.role !== "admin") return fail("Only admins can remove members")

  const { error: dbError } = await ctx.supabase
    .from("organization_members")
    .delete()
    .eq("id", memberId)
    .eq("org_id", ctx.orgId)

  if (dbError) return fail(dbError.message)
  revalidatePath("/settings")
  return ok({ done: true })
}

export async function updateMemberRole(
  memberId: string,
  role: MemberRole,
): Promise<ActionResult<{ done: true }>> {
  const parsed = memberRoleUpdateSchema.safeParse({ role })
  if (!parsed.success) return fail(zodErrorMessage(parsed.error))

  const { ctx, error } = await getAuthedOrgClient()
  if (!ctx) return fail(error)
  if (ctx.role !== "admin") return fail("Only admins can change member roles")

  const { error: dbError } = await ctx.supabase
    .from("organization_members")
    .update({ role: parsed.data.role })
    .eq("id", memberId)
    .eq("org_id", ctx.orgId)

  if (dbError) return fail(dbError.message)
  revalidatePath("/settings")
  return ok({ done: true })
}
