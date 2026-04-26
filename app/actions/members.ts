"use server"

import { revalidatePath } from "next/cache"

import { getAuthedOrgClient } from "@/lib/auth/org"
import { fail, ok } from "@/lib/validation/result"
import type { ActionResult, MemberRole, OrganizationMember } from "@/types/database"

export async function updateMemberRole(
  userId: string,
  role: MemberRole,
): Promise<ActionResult<OrganizationMember>> {
  const {ctx }= await getAuthedOrgClient()
  if (!ctx) return fail("Not authenticated")
  if (ctx.role !== "admin") return fail("Only admins can change roles")

  const { data, error } = await ctx.supabase
    .from("organization_members")
    .update({ role })
    .eq("org_id", ctx.orgId)
    .eq("user_id", userId)
    .select()
    .single()

  if (error) return fail(error.message)
  revalidatePath("/settings")
  return ok(data as OrganizationMember)
}

export async function removeMember(
  userId: string,
): Promise<ActionResult<{ user_id: string }>> {
  const { ctx } = await getAuthedOrgClient()
  if (!ctx) return fail("Not authenticated")

  const isSelf = ctx.userId === userId
  if (!isSelf && ctx.role !== "admin") return fail("Only admins can remove members")

  const { error } = await ctx.supabase
    .from("organization_members")
    .delete()
    .eq("org_id", ctx.orgId)
    .eq("user_id", userId)

  if (error) return fail(error.message)
  revalidatePath("/settings")
  return ok({ user_id: userId })
}
