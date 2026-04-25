import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { Button } from "@/components/ui/button"

export function LandingCtaBanner() {
  return (
    <section className="bg-background">
      <div className="mx-auto max-w-7xl px-6 py-20">
        <div className="relative overflow-hidden rounded-2xl bg-primary px-8 py-14 text-center text-primary-foreground sm:px-16">
          <div className="pointer-events-none absolute inset-0 opacity-40">
            <div className="absolute -top-24 -left-16 size-64 rounded-full bg-background/20 blur-3xl" />
            <div className="absolute -bottom-20 -right-10 size-72 rounded-full bg-background/20 blur-3xl" />
          </div>

          <div className="relative mx-auto max-w-2xl space-y-5">
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
              Stop writing cold DMs at midnight.
            </h2>
            <p className="text-md opacity-90">
              Spin up your ReachFlow workspace in under two minutes. Your pipeline, your voice, AI
              doing the heavy lifting.
            </p>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/sign-up">
                <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                  Start free for 14 days
                  <ArrowRight />
                </Button>
              </Link>
              <Link
                href="#features"
                className="text-sm underline-offset-4 opacity-90 hover:underline"
              >
                See every feature
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
