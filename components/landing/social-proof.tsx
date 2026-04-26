const STATS = [
  { value: "500+", label: "Agencies running outreach" },
  { value: "1.2M", label: "Prospects tracked this year" },
  { value: "38%", label: "Average reply rate lift" },
  { value: "4.9 / 5", label: "Founder rating on Pulse" },
]

export function LandingSocialProof() {
  return (
    <section aria-labelledby="social-proof" className="border-b border-border bg-card">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <h2 id="social-proof" className="sr-only">
          Trusted by hundreds of agencies
        </h2>
        <p className="text-center text-xs font-medium tracking-wider text-muted-foreground uppercase">
          Trusted by boutique agencies and in-house growth teams
        </p>
        <div className="mt-8 grid grid-cols-2 gap-8 md:grid-cols-4">
          {STATS.map((stat) => (
            <div key={stat.label} className="space-y-1 text-center">
              <div className="text-3xl font-semibold tracking-tight">{stat.value}</div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
