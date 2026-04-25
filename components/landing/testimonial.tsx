import { Quote } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"

export function LandingTestimonial() {
  return (
    <section className="border-b border-border bg-background">
      <div className="mx-auto max-w-4xl px-6 py-20 text-center">
        <span className="inline-flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Quote className="size-5" />
        </span>
        <blockquote className="mt-6 space-y-5">
          <p className="text-xl leading-relaxed font-medium tracking-tight text-foreground md:text-2xl">
            We replaced a spreadsheet, a notes app, and two Zaps with ReachFlow. Our reply rate
            went from 8% to 21% in the first month because the AI just writes better DMs than I do
            at 2am.
          </p>
          <footer className="flex items-center justify-center gap-3">
            <Avatar size="sm">
              <AvatarFallback>JM</AvatarFallback>
            </Avatar>
            <cite className="not-italic">
              <span className="text-sm font-medium text-foreground">Jordan Mills</span>
              <span className="px-2 text-muted-foreground">·</span>
              <span className="text-sm text-muted-foreground">
                Founder, Westbound Growth (3-person agency)
              </span>
            </cite>
          </footer>
        </blockquote>
      </div>
    </section>
  )
}
