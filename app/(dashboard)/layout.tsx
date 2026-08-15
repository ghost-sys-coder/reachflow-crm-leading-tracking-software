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
      <div className="dashboard-shell fixed inset-0 flex h-dvh min-h-0 gap-3 overflow-hidden bg-muted/45 p-3 lg:gap-4 lg:p-4">
        <DesktopSidebar
          userEmail={userEmail}
          userName={userName}
          orgName={orgName ?? undefined}
          orgLogoUrl={orgLogoUrl ?? undefined}
        />
        <div className="flex w-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl">
          <Topbar
            userEmail={userEmail}
            userName={userName}
            orgName={orgName ?? undefined}
            orgLogoUrl={orgLogoUrl ?? undefined}
          />
          <main id="main-content" className="w-full min-w-0 flex-1 overflow-x-hidden overflow-y-auto bg-background/65">
            <div className="mx-auto w-full min-w-0 max-w-7xl overflow-hidden p-4 sm:p-6 lg:p-8 xl:p-10">{children}</div>
          </main>
        </div>
      </div>
    </>
  )
}
