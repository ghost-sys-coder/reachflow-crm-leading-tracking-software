import type { Metadata } from "next"

import { LandingNav } from "@/components/landing/nav"
import { LandingHeroV2 } from "@/components/landing/hero-v2"
import { LandingFeaturesV2 } from "@/components/landing/features-v2"
import { LandingSocialProofV2 } from "@/components/landing/social-proof-v2"
import { LandingPricing } from "@/components/landing/pricing"
import { LandingCtaV2 } from "@/components/landing/cta-v2"
import { LandingFooter } from "@/components/landing/footer"

export const metadata: Metadata = {
  title: "ReachFlow — Turn Cold Leads into Warm Conversations",
  description:
    "The only outbound platform that combines high-performance automation with deep technical lead tracking to scale your agency's revenue.",
}

export default function LandingV2() {
  return (
    <div className="flex min-h-dvh flex-col">
      <LandingNav />
      <main className="flex-1">
        <LandingHeroV2 />
        <LandingFeaturesV2 />
        <LandingSocialProofV2 />
        <LandingPricing />
        <LandingCtaV2 />
      </main>
      <LandingFooter />
    </div>
  )
}
