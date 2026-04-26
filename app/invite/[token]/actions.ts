"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { fail, ok } from "@/lib/validation/result"
import type { ActionResult } from "@/types/database"

export async function acceptInvite(token: string): Promise<ActionResult<{ done: true }>> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return fail("Not authenticated")

  const { error } = await supabase.rpc("accept_org_invite", { p_token: token })

  if (error) return fail(error.message)
  return ok({ done: true })
}

export async function acceptInviteAndRedirect(token: string) {
  const result = await acceptInvite(token)
  if (result.error) {
    redirect(`/invite/${token}?error=${encodeURIComponent(result.error)}`)
  }
  redirect("/pipeline")
}
