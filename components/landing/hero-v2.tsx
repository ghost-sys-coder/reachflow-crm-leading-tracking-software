import Link from "next/link"
import { PlayCircle, Zap } from "lucide-react"

import { Button } from "@/components/ui/button"
import { PipelinePreview } from "@/components/landing/pipeline-preview"

export function LandingHeroV2() {
  return (
    <section className="relative flex min-h-[90vh] items-center justify-center overflow-hidden bg-gray-950 py-24 text-white">
      {/* Grid dot pattern */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage: "radial-gradient(rgba(79, 70, 229, 0.15) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
      {/* Ambient glow – top right */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-1/4 -right-1/4 h-full w-full rounded-full"
        style={{
          filter: "blur(100px)",
          background:
            "radial-gradient(circle, rgba(79,70,229,0.15) 0%, rgba(138,76,252,0.1) 50%, transparent 100%)",
        }}
      />
      {/* Ambient glow – bottom left */}
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-1/4 -left-1/4 h-full w-full rounded-full"
        style={{
          filter: "blur(100px)",
          background:
            "radial-gradient(circle, rgba(79,70,229,0.15) 0%, rgba(138,76,252,0.1) 50%, transparent 100%)",
        }}
      />

      <div className="relative z-10 mx-auto max-w-7xl px-6 text-center">
        {/* Announcement badge */}
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-4 py-2 backdrop-blur-sm">
          <Zap className="size-3.5 text-indigo-300" />
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-300">
            New: AI Sequence Optimization
          </span>
        </div>

        {/* Headline */}
        <h1 className="mx-auto mb-6 max-w-4xl text-4xl font-bold tracking-tight md:text-[64px] md:leading-18">
          Turn <span className="text-violet-400">Cold Leads</span> into Warm Conversations.
        </h1>

        {/* Subtext */}
        <p className="mx-auto mb-12 max-w-2xl text-lg leading-relaxed text-gray-400 md:text-xl">
          The only outbound platform that combines high-performance automation with deep technical
          lead tracking to scale your agency&apos;s revenue.
        </p>

        {/* CTAs */}
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link href="/sign-up">
            <Button size="lg" className="w-full px-8 shadow-lg shadow-primary/20 sm:w-auto">
              Start Your Free Trial
            </Button>
          </Link>
          <Link href="#features">
            <Button
              size="lg"
              variant="outline"
              className="w-full border-white/20 bg-white/5 px-8 text-white backdrop-blur-sm hover:bg-white/10 hover:text-white sm:w-auto"
            >
              <PlayCircle className="size-4" />
              Watch Demo
            </Button>
          </Link>
        </div>

        {/* Dashboard mockup */}
        <div className="group relative mt-20">
          <div className="absolute -inset-1 rounded-xl bg-linear-to-r from-primary to-secondary opacity-25 blur transition duration-1000 group-hover:opacity-40" />
          <div className="relative flex items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-gray-900 p-8 shadow-2xl">
            <PipelinePreview />
          </div>
        </div>
      </div>
    </section>
  )
}
