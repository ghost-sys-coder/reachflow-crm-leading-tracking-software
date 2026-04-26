import { redirect } from "next/navigation"
import { Sparkles } from "lucide-react"

import { OnboardingForm } from "@/components/onboarding/onboarding-form"
import { createClient } from "@/lib/supabase/server"

export default async function OnboardingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/sign-in")

  // Fast path: metadata flag already set
  if (user.user_metadata?.onboarding_complete) redirect("/pipeline")

  // Slow path: existing user whose agency_name was set before the metadata flag existed.
  // Check the org directly and backfill the flag so future checks are instant.
  const { data: membership } = await supabase
    .from("organization_members")
    .select("org_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle()

  if (membership) {
    const { data: org } = await supabase
      .from("organizations")
      .select("agency_name")
      .eq("id", membership.org_id)
      .maybeSingle()

    if (org?.agency_name) {
      // Backfill the flag so future logins skip this DB check
      await supabase.auth.updateUser({ data: { onboarding_complete: true } })
      redirect("/pipeline")
    }
  }

  return (
    <div className="space-y-8">
      <div className="space-y-1.5">
        <div className="mb-4 inline-flex size-10 items-center justify-center rounded-xl border border-border bg-muted text-primary">
          <Sparkles className="size-5" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Set up your workspace</h1>
        <p className="text-sm text-muted-foreground">
          Tell us about your agency so the AI can craft personalised outreach. You can update
          these anytime in Settings.
        </p>
      </div>

      <OnboardingForm />
    </div>
  )
}
