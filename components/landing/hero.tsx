import Link from "next/link"
import { ArrowRight, Sparkles } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PipelinePreview } from "@/components/landing/pipeline-preview"

export function LandingHero() {
  return (
    <section className="relative overflow-hidden border-b border-border bg-background">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 size-144 -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute -bottom-20 -right-20 size-112 rounded-full bg-accent-foreground/10 blur-3xl" />
      </div>

      <div className="relative mx-auto grid max-w-7xl gap-12 px-6 py-20 lg:grid-cols-[1.05fr_1fr] lg:py-28">
        <div className="flex flex-col justify-center gap-8">
          <Badge variant="secondary" className="w-fit gap-1.5">
            <Sparkles className="size-3" />
            AI outreach, built in
          </Badge>

          <div className="space-y-5">
            <h1 className="text-4xl leading-[1.05] font-semibold tracking-tight md:text-[3.25rem]">
              The CRM that writes your cold DMs,
              <br />
              <span className="text-primary">so you send more of them.</span>
            </h1>
            <p className="max-w-xl text-base text-muted-foreground md:text-md">
              ReachFlow is a pipeline and AI copywriter rolled into one. Add a prospect, generate a
              message tuned to their industry and platform, and keep the whole conversation in one
              clean view.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link href="/sign-up">
              <Button size="lg" className="w-full sm:w-auto">
                Start free for 14 days
                <ArrowRight />
              </Button>
            </Link>
            <Link href="#ai-showcase">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                See the AI generator
              </Button>
            </Link>
          </div>

          <p className="text-xs text-muted-foreground">
            No credit card required. Cancel anytime. Works with Instagram, email, and LinkedIn.
          </p>
        </div>

        <div className="relative flex items-center justify-center">
          <PipelinePreview />
        </div>
      </div>
    </section>
  )
}
