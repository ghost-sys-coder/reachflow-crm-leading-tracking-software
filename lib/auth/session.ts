import { createClient } from "@/lib/supabase/server"

//returns an authed Supabase client plus the current user,
//or null user if the session is missing or invalid
export async function getAuthedClient() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  return { supabase, user: error ? null : user }
}
