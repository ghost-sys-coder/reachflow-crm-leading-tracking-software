import { Check, Copy, Sparkles, Wand2 } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

const BULLETS = [
  "Pulls context from the prospect's industry, platform, and city",
  "Writes in three tones: direct, friendly, or playful",
  "Generates follow-ups that reference the original message",
  "Never pastes corporate-speak or em-dash essays",
]

export function LandingAiShowcase() {
  return (
    <section id="ai-showcase" className="border-b border-border bg-card">
      <div className="mx-auto grid max-w-7xl gap-12 px-6 py-20 lg:grid-cols-2 lg:items-center">
        <div className="space-y-6">
          <Badge variant="secondary" className="gap-1.5">
            <Sparkles className="size-3" />
            AI outreach generator
          </Badge>

          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
            Personalized outreach in the time it takes to open a DM.
          </h2>
          <p className="text-md text-muted-foreground">
            Pick a prospect, pick a channel, hit generate. ReachFlow writes a message referencing
            their niche, their city, and a specific pain point. Copy, paste, send.
          </p>

          <ul className="space-y-3">
            {BULLETS.map((bullet) => (
              <li key={bullet} className="flex items-start gap-3 text-sm">
                <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <Check className="size-3" />
                </span>
                <span className="text-foreground">{bullet}</span>
              </li>
            ))}
          </ul>
        </div>

        <AiGeneratorMock />
      </div>
    </section>
  )
}

function AiGeneratorMock() {
  return (
    <div className="rounded-2xl border border-border bg-background p-5 shadow-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarFallback>SP</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-semibold">Sam&apos;s Plumbing</p>
            <p className="text-xs text-muted-foreground">Instagram · Tucson, AZ</p>
          </div>
        </div>
        <Badge className="bg-primary/15 text-primary">Draft</Badge>
      </div>

      <div className="mt-5 space-y-3">
        <div className="flex items-center gap-2 rounded-md border border-border bg-muted/60 px-3 py-2">
          <Wand2 className="size-3.5 text-primary" />
          <p className="text-xs">
            <span className="font-medium">Channel</span>{" "}
            <span className="text-muted-foreground">Instagram DM</span>{" "}
            <span className="mx-1.5 text-border">·</span>
            <span className="font-medium">Tone</span>{" "}
            <span className="text-muted-foreground">Direct</span>
          </p>
        </div>

        <div className="rounded-lg border border-border bg-muted p-4">
          <div className="flex items-center gap-2 pb-2 text-xs text-muted-foreground">
            <Sparkles className="size-3 text-primary" />
            Generated message
          </div>
          <p className="text-sm leading-relaxed">
            Hey Sam, noticed Sam&apos;s Plumbing has 12 Google reviews after 8 years in Tucson.
            Most local plumbers sit around 40. I run a tiny agency that helps trades pull 20+
            reviews in 30 days using a 3-text flow. Want me to send over the playbook?
          </p>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">42 words · ~8 second read</p>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm">
              <Wand2 />
              Regenerate
            </Button>
            <Button size="sm">
              <Copy />
              Copy and send
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
