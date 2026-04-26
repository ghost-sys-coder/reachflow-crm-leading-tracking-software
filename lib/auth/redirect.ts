import type { SupabaseClient } from "@supabase/supabase-js"

// Returns the correct post-auth destination using the JWT metadata flag.
// No DB query needed — the flag is embedded in the session token.
export async function getPostAuthRedirect(supabase: SupabaseClient): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return "/sign-in"
  return user.user_metadata?.onboarding_complete ? "/pipeline" : "/onboarding"
}
