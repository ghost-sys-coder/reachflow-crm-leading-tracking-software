import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next")

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // next param (e.g. from password reset) takes priority
      if (next) {
        return NextResponse.redirect(`${origin}${next}`)
      }

      // Use metadata flag — no DB query needed, value is in the JWT
      const {
        data: { user },
      } = await supabase.auth.getUser()
      const onboardingDone = user?.user_metadata?.onboarding_complete === true
      return NextResponse.redirect(`${origin}${onboardingDone ? "/pipeline" : "/onboarding"}`)
    }
  }

  return NextResponse.redirect(
    `${origin}/sign-in?error=${encodeURIComponent("Could not authenticate user")}`,
  )
}
