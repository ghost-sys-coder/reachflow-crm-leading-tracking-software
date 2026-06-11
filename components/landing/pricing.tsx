import Link from "next/link"
import { CheckCircle2 } from "lucide-react"

import { Button } from "@/components/ui/button"

type Plan = {
  name: string
  description: string
  price: string
  period: string | null
  features: string[]
  cta: string
  ctaHref: string
  highlighted: boolean
}

const PLANS: Plan[] = [
  {
    name: "Starter",
    description: "Perfect for individuals and small startups.",
    price: "$49",
    period: "/mo",
    features: ["500 leads/mo", "Basic automation", "Email support"],
    cta: "Get Started",
    ctaHref: "/sign-up",
    highlighted: false,
  },
  {
    name: "Pro",
    description: "Advanced features for growing teams.",
    price: "$129",
    period: "/mo",
    features: [
      "2,500 leads/mo",
      "Multi-channel sequences",
      "CRM integration",
      "Priority support",
    ],
    cta: "Start Free Trial",
    ctaHref: "/sign-up",
    highlighted: true,
  },
  {
    name: "Enterprise",
    description: "Dedicated solutions for large-scale operations.",
    price: "Custom",
    period: null,
    features: [
      "Unlimited leads",
      "Dedicated account manager",
      "Custom API access",
      "White-labeling",
    ],
    cta: "Contact Sales",
    ctaHref: "#contact",
    highlighted: false,
  },
]

export function LandingPricing() {
  return (
    <section id="pricing" className="bg-muted/20 py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
            Transparent Pricing for Every Stage
          </h2>
          <p className="mx-auto max-w-xl text-muted-foreground">
            Choose the plan that fits your agency&apos;s growth trajectory. No hidden fees.
          </p>
        </div>

        <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-2xl border bg-card p-8 transition-all ${
                plan.highlighted
                  ? "z-10 scale-[1.05] border-2 border-primary shadow-xl shadow-primary/10"
                  : "border-border hover:border-primary/30"
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-semibold uppercase tracking-wider text-primary-foreground">
                  Most Popular
                </div>
              )}

              <div className="mb-8">
                <h3 className="mb-2 text-lg font-bold">{plan.name}</h3>
                <p className="mb-6 text-sm text-muted-foreground">{plan.description}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-[32px] font-bold">{plan.price}</span>
                  {plan.period && (
                    <span className="text-muted-foreground">{plan.period}</span>
                  )}
                </div>
              </div>

              <ul className="mb-8 flex-1 space-y-4">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <CheckCircle2 className="size-5 shrink-0 text-primary" />
                    {feature}
                  </li>
                ))}
              </ul>

              <Link href={plan.ctaHref}>
                <Button className="w-full" variant={plan.highlighted ? "default" : "outline"}>
                  {plan.cta}
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
