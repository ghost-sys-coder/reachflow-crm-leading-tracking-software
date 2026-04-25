import { Plus, Send, Sparkles } from "lucide-react"

const STEPS = [
  {
    number: "01",
    icon: Plus,
    title: "Add a prospect",
    body: "Drop in the business name, platform, handle or email, industry, and a note. Thirty seconds per lead.",
  },
  {
    number: "02",
    icon: Sparkles,
    title: "Generate the outreach",
    body: "Pick the channel and tone, hit generate. ReachFlow writes a personalized message in seconds.",
  },
  {
    number: "03",
    icon: Send,
    title: "Send and track",
    body: "Copy the message, send it from the prospect's platform, and move the card through your pipeline.",
  },
]

export function LandingHowItWorks() {
  return (
    <section id="how-it-works" className="border-b border-border bg-background">
      <div className="mx-auto max-w-7xl px-6 py-20">
        <div className="max-w-2xl space-y-3">
          <p className="text-sm font-semibold tracking-wider text-primary uppercase">How it works</p>
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
            Three steps from blank page to booked call.
          </h2>
        </div>

        <ol className="mt-12 grid gap-4 md:grid-cols-3">
          {STEPS.map(({ number, icon: Icon, title, body }) => (
            <li
              key={number}
              className="relative flex flex-col gap-4 rounded-xl border border-border bg-card p-6"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-semibold tracking-wider text-muted-foreground">
                  {number}
                </span>
                <span className="inline-flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Icon className="size-4" />
                </span>
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
                <p className="text-sm text-muted-foreground">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
