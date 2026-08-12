import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Reveal } from "@/components/landing/reveal"

export function LandingCtaV2() {
  return (
    <section className="bg-[#fbfbf8] py-28 text-[#171715] sm:py-40">
      <Reveal className="mx-auto max-w-[900px] px-5 text-center sm:px-8">
        <p className="text-[11px] font-semibold tracking-[0.18em] text-[#356df3] uppercase">Start with your next prospect</p>
        <h2 className="mt-6 text-balance font-[Georgia,serif] text-4xl leading-[1] font-semibold tracking-[-0.045em] sm:text-7xl">Make every follow-up feel intentional.</h2>
        <p className="mx-auto mt-7 max-w-xl text-base leading-7 text-[#696963]">Set up your workspace in minutes. No credit card and no complicated migration required.</p>
        <Link href="/sign-up" className="mt-9 inline-flex h-12 items-center gap-2 bg-[#171715] px-7 text-sm font-medium text-white transition hover:bg-[#356df3]">Start for free <ArrowRight className="size-4" /></Link>
      </Reveal>
    </section>
  )
}
