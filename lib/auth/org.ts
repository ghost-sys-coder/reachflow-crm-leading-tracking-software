import { createClient } from "@/lib/supabase/server"
import type { MemberRole } from "@/types/database"

export type OrgContext = {
  supabase: Awaited<ReturnType<typeof createClient>>
  userId: string
  orgId: string
  role: MemberRole
}

type OrgClientResult =
  | { ctx: OrgContext; error: null }
  | { ctx: null; error: string }

// Returns the org context for the authed user, or an error string explaining why it failed.
// Callers should destructure: const { ctx, error } = await getAuthedOrgClient()
export async function getAuthedOrgClient(): Promise<OrgClientResult> {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError) return { ctx: null, error: `Authentication error: ${authError.message}` }
  if (!user) return { ctx: null, error: "Not authenticated" }

  const { data: membership, error: memberError } = await supabase
    .from("organization_members")
    .select("org_id, role")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle()

  if (memberError) return { ctx: null, error: `Could not load organisation: ${memberError.message}` }
  if (!membership) return { ctx: null, error: "No organisation membership found — please complete onboarding." }

  return {
    ctx: {
      supabase,
      userId: user.id,
      orgId: membership.org_id,
      role: membership.role as MemberRole,
    },
    error: null,
  }
}
