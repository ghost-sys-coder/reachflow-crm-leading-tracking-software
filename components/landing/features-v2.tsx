import { CheckCircle2, Inbox, RefreshCcw, TrendingUp } from "lucide-react"

type Feature = {
  icon: React.ElementType
  colorClass: string
  title: string
  body: string
  bullets: string[]
}

const FEATURES: Feature[] = [
  {
    icon: RefreshCcw,
    colorClass:
      "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground",
    title: "Automated Sequences",
    body: "Design multi-channel outreach workflows that adapt based on lead behavior. Higher response rates, zero manual work.",
    bullets: ["A/B testing functionality", "Conditional logic branching"],
  },
  {
    icon: TrendingUp,
    colorClass:
      "bg-purple-500/10 text-purple-500 group-hover:bg-purple-500 group-hover:text-white",
    title: "Smart Lead Tracking",
    body: "See every email open, link click, and document view in real-time. Know exactly when your leads are ready to talk.",
    bullets: ["Real-time intent scoring", "IP-based company tracking"],
  },
  {
    icon: Inbox,
    colorClass:
      "bg-orange-500/10 text-orange-500 group-hover:bg-orange-500 group-hover:text-white",
    title: "Integrated Inbox",
    body: "Manage all replies from every campaign in one unified, distraction-free dashboard. Stop switching tabs.",
    bullets: ["Unified lead history", "One-click CRM sync"],
  },
]

export function LandingFeaturesV2() {
  return (
    <section id="features" className="bg-background py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
            Engineered for High-Performance Teams
          </h2>
          <p className="mx-auto max-w-xl text-muted-foreground">
            Everything you need to automate your outreach without losing the human touch.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {FEATURES.map(({ icon: Icon, colorClass, title, body, bullets }) => (
            <div
              key={title}
              className="group rounded-xl border border-border bg-card p-10 transition-all hover:border-primary/50"
            >
              <div
                className={`mb-6 flex size-12 items-center justify-center rounded-lg transition-colors ${colorClass}`}
              >
                <Icon className="size-6" />
              </div>
              <h3 className="mb-3 text-lg font-semibold">{title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
              <ul className="mt-6 space-y-3">
                {bullets.map((bullet) => (
                  <li key={bullet} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="size-4 shrink-0 text-green-500" />
                    {bullet}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
