import {
  Inbox,
  LineChart,
  MessagesSquare,
  Sparkles,
  Target,
  Users,
} from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const FEATURES = [
  {
    icon: Sparkles,
    title: "AI messages that sound like you",
    body: "Generate DMs, cold emails, and follow-ups tuned to each prospect's platform, industry, and pain points. Edit the tone in one click.",
  },
  {
    icon: Target,
    title: "Outreach-native pipeline",
    body: "Status tags built for cold outreach: Sent, Waiting, Replied, Booked, Dead. No Kanban retrofitting, no SDR enterprise bloat.",
  },
  {
    icon: Inbox,
    title: "Every reply in one place",
    body: "Log screenshots or paste replies straight into the prospect card. Your whole team sees the same conversation history.",
  },
  {
    icon: LineChart,
    title: "Pipeline metrics that matter",
    body: "Reply rate, booked calls, and time-to-response per channel. See which platforms convert so you stop wasting sends.",
  },
  {
    icon: Users,
    title: "Built for tiny teams",
    body: "Invite up to 5 seats on the starter plan. No per-contact pricing, no quotas. Priced for solo freelancers and boutique agencies.",
  },
  {
    icon: MessagesSquare,
    title: "Paste from anywhere",
    body: "Send from Instagram, iMessage, or your own inbox. ReachFlow copies the message, you handle the send, we track the status.",
  },
]

export function LandingFeatures() {
  return (
    <section id="features" className="border-b border-border bg-background">
      <div className="mx-auto max-w-7xl px-6 py-20">
        <div className="max-w-2xl space-y-3">
          <p className="text-sm font-semibold tracking-wider text-primary uppercase">
            Why ReachFlow
          </p>
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
            Cold outreach tools are either bloated enterprise CRMs or half-broken spreadsheets.
          </h2>
          <p className="text-md text-muted-foreground">
            ReachFlow sits in the sweet spot. Enough pipeline to stay organized, enough AI to stay
            personal, none of the SDR-team overhead.
          </p>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <Card key={title}>
              <CardHeader>
                <span className="inline-flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Icon className="size-4" />
                </span>
                <CardTitle className="pt-2">{title}</CardTitle>
                <CardDescription>{body}</CardDescription>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                Included in every plan.
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
