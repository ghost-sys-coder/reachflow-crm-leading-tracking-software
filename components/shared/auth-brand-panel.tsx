import { MessageSquare, Send, Sparkles, TrendingUp } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { BrandMark } from "@/components/shared/brand-mark"

const FEATURES = [
  {
    icon: Sparkles,
    title: "AI that knows your niche",
    body: "Generate personalized DMs and cold emails tuned to each prospect's industry and platform.",
  },
  {
    icon: TrendingUp,
    title: "Pipeline built for outreach",
    body: "Track Sent, Waiting, Replied, Booked, and Dead without wrestling a generic CRM.",
  },
  {
    icon: MessageSquare,
    title: "Every touchpoint in one place",
    body: "Notes, status changes, and follow-ups live next to each prospect.",
  },
]

export function AuthBrandPanel() {
  return (
    <div className="relative hidden min-h-[100dvh] flex-col overflow-hidden bg-card p-10 lg:flex">
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <div className="absolute -top-40 -right-24 size-[32rem] rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-24 size-[28rem] rounded-full bg-accent-foreground/10 blur-3xl" />
      </div>

      <div className="relative flex h-full flex-col justify-between gap-10">
        <BrandMark size="md" />

        <div className="space-y-8">
          <div className="space-y-3">
            <Badge variant="secondary" className="text-xs">
              Built for agencies
            </Badge>
            <h2 className="text-3xl leading-tight font-semibold tracking-tight">
              Cold outreach that
              <br />
              feels personal at scale.
            </h2>
            <p className="max-w-md text-sm text-muted-foreground">
              ReachFlow is the CRM made for agencies running high-volume prospecting. Keep every
              lead, every message, and every reply in one clean pipeline.
            </p>
          </div>

          <PreviewCard />
        </div>

        <ul className="grid gap-4 sm:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <li key={title} className="space-y-1.5">
              <span className="inline-flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Icon className="size-3.5" />
              </span>
              <p className="text-sm font-medium">{title}</p>
              <p className="text-xs leading-relaxed text-muted-foreground">{body}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function PreviewCard() {
  return (
    <div className="max-w-md rounded-xl border border-border bg-background/70 p-4 shadow-sm backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar size="sm">
            <AvatarFallback>SD</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium">Sam&apos;s Plumbing</p>
            <p className="text-xs text-muted-foreground">Instagram · Tucson, AZ</p>
          </div>
        </div>
        <Badge className="bg-success text-success-foreground">Replied</Badge>
      </div>

      <div className="mt-4 space-y-2 rounded-lg bg-muted p-3">
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Sparkles className="size-3" />
          Suggested reply
        </p>
        <p className="text-sm">
          Hey Sam, noticed you only have 12 reviews on Google despite being open 8 years. Mind if I
          send over the 3-text flow we use to pull in 20+ reviews in 30 days?
        </p>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Draft · 42 words</p>
        <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
          <Send className="size-3" />
          Copy and send
        </span>
      </div>
    </div>
  )
}
