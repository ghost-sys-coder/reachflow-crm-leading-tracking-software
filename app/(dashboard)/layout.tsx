import { redirect } from "next/navigation"

import { getCurrentOrg, getCurrentProfile } from "@/app/actions/profile"
import { DesktopSidebar } from "@/components/shared/sidebar"
import { Topbar } from "@/components/shared/topbar"
import { createClient } from "@/lib/supabase/server"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/sign-in")
  }

  // Gate: onboarding_complete lives in the JWT — no extra DB round-trip needed
  if (!user.user_metadata?.onboarding_complete) {
    redirect("/onboarding")
  }

  const [profileResult, orgResult] = await Promise.all([
    getCurrentProfile(),
    getCurrentOrg(),
  ])

  const profile = profileResult.data
  const org = orgResult.data
  const userEmail = user.email ?? ""
  const userName = profile?.full_name ?? null

  const whiteLabelEnabled = org?.white_label_enabled ?? false
  const orgName = whiteLabelEnabled ? (org?.agency_name ?? null) : null
  const orgLogoUrl = whiteLabelEnabled ? (org?.logo_url ?? null) : null
  const brandPrimary = whiteLabelEnabled ? (org?.brand_primary_color ?? null) : null
  const brandAccent = whiteLabelEnabled ? (org?.brand_accent_color ?? null) : null

  return (
    <>
      {whiteLabelEnabled && (brandPrimary || brandAccent) && (
        <style>{`
          :root[data-theme] {
            ${brandPrimary ? `--color-primary: ${brandPrimary};` : ""}
            ${brandAccent ? `--color-accent: ${brandAccent};` : ""}
          }
        `}</style>
      )}
      <div className="flex h-dvh overflow-hidden">
        <DesktopSidebar
          userEmail={userEmail}
          userName={userName}
          orgName={orgName ?? undefined}
          orgLogoUrl={orgLogoUrl ?? undefined}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar
            userEmail={userEmail}
            userName={userName}
            orgName={orgName ?? undefined}
            orgLogoUrl={orgLogoUrl ?? undefined}
          />
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">{children}</div>
          </main>
        </div>
      </div>
    </>
  )
}
