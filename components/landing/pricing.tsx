import Link from "next/link"
import { Check } from "lucide-react"

import { Reveal } from "@/components/landing/reveal"

const PLANS = [
  { name: "Starter", price: "$49", note: "For a focused solo operator", features: ["500 prospects / month", "Core outreach pipeline", "Message history", "Email support"] },
  { name: "Pro", price: "$129", note: "For teams building momentum", featured: true, features: ["2,500 prospects / month", "Multi-channel sequences", "Team assignments", "Priority support"] },
  { name: "Enterprise", price: "Let’s talk", note: "For larger outreach operations", features: ["Unlimited prospects", "Dedicated onboarding", "Custom integrations", "White-label controls"] },
]

export function LandingPricing() {
  return (
    <section id="pricing" className="border-b border-[#e8e8e4] bg-[#fbfbf8] py-28 text-[#171715] sm:py-36">
      <div className="mx-auto max-w-[1180px] px-5 sm:px-8">
        <Reveal className="grid gap-8 border-b border-[#dcdcd6] pb-14 lg:grid-cols-2">
          <h2 className="max-w-xl text-balance font-[Georgia,serif] text-4xl leading-[1.02] font-semibold tracking-[-0.045em] sm:text-6xl">Simple pricing for a serious outreach process.</h2>
          <p className="max-w-md self-end text-base leading-7 text-[#696963] lg:justify-self-end">Start small, keep the full history, and move up when your team needs more volume.</p>
        </Reveal>
        <div className="grid lg:grid-cols-3">
          {PLANS.map((plan, index) => (
            <Reveal key={plan.name} delay={index * .06} className="h-full">
              <article className={`flex h-full flex-col border-b border-[#dcdcd6] py-10 lg:border-b-0 lg:p-10 ${index ? "lg:border-l" : "lg:pl-0"}`}>
                <div className="flex items-center justify-between"><h3 className="text-sm font-semibold">{plan.name}</h3>{plan.featured && <span className="bg-[#171715] px-2 py-1 text-[9px] tracking-wider text-white uppercase">Recommended</span>}</div>
                <p className="mt-8 font-mono text-3xl tracking-[-0.05em]">{plan.price}</p>
                <p className="mt-3 min-h-10 text-xs text-[#777770]">{plan.note}</p>
                <ul className="mt-9 flex-1 space-y-4 border-t border-[#e4e4df] pt-7">{plan.features.map(feature => <li key={feature} className="flex gap-3 text-sm text-[#555550]"><Check className="mt-0.5 size-3.5 text-[#356df3]" />{feature}</li>)}</ul>
                <Link href="/sign-up" className={`mt-10 inline-flex h-10 items-center justify-center border px-5 text-sm font-medium transition ${plan.featured ? "border-[#171715] bg-[#171715] text-white hover:border-[#356df3] hover:bg-[#356df3]" : "border-[#cfcfc8] hover:border-[#171715]"}`}>{plan.name === "Enterprise" ? "Contact us" : "Get started"}</Link>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
