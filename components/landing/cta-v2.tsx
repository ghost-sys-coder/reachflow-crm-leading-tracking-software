import Link from "next/link"
import { ArrowRight, BadgeCheck } from "lucide-react"

import { Button } from "@/components/ui/button"

export function LandingCtaV2() {
  return (
    <section className="relative overflow-hidden py-24">
      {/* Gradient bg */}
      <div className="absolute inset-0 bg-linear-to-br from-primary via-violet-700 to-gray-950" />
      {/* Subtle grid overlay */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,0.3) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      <div className="relative z-10 mx-auto max-w-7xl px-6 text-center">
        <h2 className="mb-8 text-[36px] font-bold leading-tight text-white md:text-[56px] md:leading-16">
          Ready to Flow into Your Next Deal?
        </h2>
        <p className="mx-auto mb-12 max-w-2xl text-lg text-white/80 md:text-xl">
          Join hundreds of agencies who have automated their pipeline. No credit card required.
          Cancel anytime.
        </p>

        <div className="flex flex-col items-center justify-center gap-6 sm:flex-row">
          <Link href="/sign-up">
            <Button
              size="lg"
              className="w-full bg-white px-10 text-primary hover:bg-white/90 sm:w-auto"
            >
              Start Your 14-Day Free Trial
            </Button>
          </Link>
          <Link
            href="#contact"
            className="flex items-center gap-2 border-b-2 border-white/30 py-2 text-white transition-all hover:border-white"
          >
            Talk to an Outreach Specialist
            <ArrowRight className="size-4" />
          </Link>
        </div>

        {/* Trust badges */}
        <div className="mt-12 flex items-center justify-center gap-8 text-xs text-white/60">
          <div className="flex items-center gap-1.5">
            <BadgeCheck className="size-4" />
            G2 Leader 2024
          </div>
          <div className="flex items-center gap-1.5">
            <BadgeCheck className="size-4" />
            SOC2 Compliant
          </div>
        </div>
      </div>
    </section>
  )
}
