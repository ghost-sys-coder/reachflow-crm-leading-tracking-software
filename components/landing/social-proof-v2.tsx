import { Gem, Globe, Layers, Rocket, Shield, Star } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"

const BRANDS = [
  { icon: Globe, name: "NEXUS" },
  { icon: Gem, name: "ELITE" },
  { icon: Rocket, name: "ORBIT" },
  { icon: Shield, name: "AEGIS" },
  { icon: Layers, name: "VELOCITY" },
]

export function LandingSocialProofV2() {
  return (
    <section className="overflow-hidden bg-muted/30 py-20">
      <div className="mx-auto max-w-7xl px-6">
        <p className="mb-12 text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Trusted by 500+ High-Growth Agencies
        </p>

        {/* Brand logos */}
        <div className="mb-20 flex flex-wrap items-center justify-center gap-12 opacity-50">
          {BRANDS.map(({ icon: Icon, name }) => (
            <div
              key={name}
              className="flex items-center gap-2 grayscale transition-all hover:grayscale-0"
            >
              <Icon className="size-7" />
              <span className="text-xl font-bold">{name}</span>
            </div>
          ))}
        </div>

        {/* Testimonial */}
        <div className="mx-auto max-w-4xl rounded-2xl border border-border bg-card p-12 shadow-sm">
          <div className="flex flex-col items-center text-center">
            <div className="mb-6 flex gap-1 text-amber-400">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="size-5 fill-current" />
              ))}
            </div>
            <blockquote className="mb-8 text-xl font-semibold italic leading-snug text-foreground md:text-2xl">
              &ldquo;ReachFlow changed the game for our outbound strategy. We&apos;ve seen a 40%
              increase in meeting bookings within the first 60 days of switching.&rdquo;
            </blockquote>
            <div className="flex items-center gap-4">
              <Avatar>
                <AvatarFallback className="bg-primary/10 font-semibold text-primary">
                  DC
                </AvatarFallback>
              </Avatar>
              <div className="text-left">
                <p className="font-semibold text-foreground">David Chen</p>
                <p className="text-xs text-muted-foreground">Founder, ScalePath Agency</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
