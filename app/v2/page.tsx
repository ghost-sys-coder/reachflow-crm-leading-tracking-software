import type { Metadata } from "next"

import { LandingNavV2 } from "@/components/landing/nav-v2"
import { LandingHeroV2 } from "@/components/landing/hero-v2"
import { LandingFeaturesV2 } from "@/components/landing/features-v2"
import { LandingSocialProofV2 } from "@/components/landing/social-proof-v2"
import { LandingPricing } from "@/components/landing/pricing"
import { LandingCtaV2 } from "@/components/landing/cta-v2"
import { LandingFooterV2 } from "@/components/landing/footer-v2"

export const metadata: Metadata = {
  title: "ReachFlow — Turn Cold Leads into Warm Conversations",
  description:
    "The only outbound platform that combines high-performance automation with deep technical lead tracking to scale your agency's revenue.",
}

export default function LandingV2() {
  return (
    <div className="flex min-h-dvh flex-col bg-[#fbfbf8] text-[#171715] [--background:#fbfbf8] [--border:#deded8] [--card:#fff] [--card-foreground:#171715] [--foreground:#171715] [--muted:#f1f1ed] [--muted-foreground:#6b6b65] [--primary:#356df3] [--primary-foreground:#fff] [--success:#2f8f63] [color-scheme:light]">
      <LandingNavV2 />
      <main className="flex-1">
        <LandingHeroV2 />
        <LandingFeaturesV2 />
        <LandingSocialProofV2 />
        <LandingPricing />
        <LandingCtaV2 />
      </main>
      <LandingFooterV2 />
    </div>
  )
}
