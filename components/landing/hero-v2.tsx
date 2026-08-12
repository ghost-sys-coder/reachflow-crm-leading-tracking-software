import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { PipelinePreview } from "@/components/landing/pipeline-preview"
import { Reveal } from "@/components/landing/reveal"

export function LandingHeroV2() {
  return (
    <section className="overflow-hidden border-b border-[#e8e8e4] bg-[#fbfbf8] pt-24 text-[#171715] sm:pt-32">
      <div className="mx-auto max-w-[1180px] px-5 sm:px-8">
        <Reveal className="mx-auto max-w-4xl text-center">
          <p className="mb-6 text-[11px] font-semibold tracking-[0.2em] text-[#6b6b65] uppercase">
            Outreach operations for ambitious agencies
          </p>
          <h1 className="text-balance font-[Georgia,serif] text-[3.25rem] leading-[0.96] font-semibold tracking-[-0.055em] sm:text-7xl lg:text-[5.7rem]">
            Turn cold outreach into a repeatable growth system.
          </h1>
          <p className="mx-auto mt-7 max-w-2xl text-pretty text-base leading-7 text-[#62625c] sm:text-lg">
            ReachFlow keeps prospecting, personalized messages, follow-ups, and every conversation in one calm workspace.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/sign-up" className="inline-flex h-11 items-center gap-2 bg-[#171715] px-6 text-sm font-medium text-white transition hover:bg-[#356df3] active:translate-y-px">
              Start for free <ArrowRight className="size-4" />
            </Link>
            <Link href="#features" className="text-sm font-medium text-[#353532] underline decoration-[#b8b8b2] underline-offset-4 transition hover:decoration-[#171715]">
              See how it works
            </Link>
          </div>
        </Reveal>

        <Reveal delay={0.12} className="relative mx-auto mt-20 max-w-5xl pb-1 sm:mt-24">
          <div className="absolute inset-x-[8%] bottom-0 h-36 bg-[#dfe9ff] blur-3xl" aria-hidden />
          <div className="relative border border-[#deded8] bg-white p-3 shadow-[0_30px_80px_rgba(28,28,24,0.12)] sm:p-7">
            <div className="mb-5 flex items-center justify-between border-b border-[#ecece8] pb-4">
              <div className="flex gap-1.5"><span className="size-2 rounded-full bg-[#dadad4]" /><span className="size-2 rounded-full bg-[#dadad4]" /><span className="size-2 rounded-full bg-[#dadad4]" /></div>
              <span className="font-mono text-[10px] tracking-wider text-[#8a8a83] uppercase">Live pipeline</span>
            </div>
            <PipelinePreview />
          </div>
        </Reveal>
      </div>
    </section>
  )
}
