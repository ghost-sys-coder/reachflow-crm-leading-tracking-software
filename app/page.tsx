import type { Metadata } from "next"

import { LandingAiShowcase } from "@/components/landing/ai-showcase"
import { LandingCtaBanner } from "@/components/landing/cta-banner"
import { LandingFeatures } from "@/components/landing/features"
import { LandingFooter } from "@/components/landing/footer"
import { LandingHero } from "@/components/landing/hero"
import { LandingHowItWorks } from "@/components/landing/how-it-works"
import { LandingNav } from "@/components/landing/nav"
import { LandingSocialProof } from "@/components/landing/social-proof"
import { LandingTestimonial } from "@/components/landing/testimonial"

export const metadata: Metadata = {
  title: "ReachFlow — The CRM that writes your cold DMs",
  description:
    "ReachFlow is the CRM for digital agencies running cold outreach. AI-generated DMs and emails, an outreach-native pipeline, and every reply in one place.",
}

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <LandingNav />
      <main className="flex-1">
        <LandingHero />
        <LandingSocialProof />
        <LandingFeatures />
        <LandingAiShowcase />
        <LandingHowItWorks />
        <LandingTestimonial />
        <LandingCtaBanner />
      </main>
      <LandingFooter />
    </div>
  )
}
