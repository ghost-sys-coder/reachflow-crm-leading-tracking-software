"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import { fail, ok } from "@/lib/validation/result"
import type { ActionResult, Organization } from "@/types/database"

export async function completeOnboarding(input: {
  agency_name: string
  sender_name?: string
}): Promise<ActionResult<Organization>> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return fail("Not authenticated")

  const agencyName = input.agency_name.trim()
  if (!agencyName) return fail("Agency name is required")

  // complete_user_onboarding is SECURITY DEFINER for one specific reason:
  // the first organization_members row for a user cannot pass the "must
  // already be an org admin" INSERT policy. The RPC handles both the
  // normal path (membership exists) and the recovery path (trigger failed).
  const { data, error } = await supabase.rpc("complete_user_onboarding", {
    p_agency_name: agencyName,
    p_sender_name: input.sender_name?.trim() || null,
  })

  if (error) return fail(error.message)

  // Stamp the JWT so every subsequent gate check is a zero-DB read
  await supabase.auth.updateUser({ data: { onboarding_complete: true } })

  revalidatePath("/pipeline")
  revalidatePath("/settings")
  return ok(data as Organization)
}
