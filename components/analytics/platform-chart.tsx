import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { AnalyticsData } from "@/app/actions/analytics"

const PLATFORM_LABELS: Record<string, string> = {
  instagram: "Instagram",
  email:     "Email",
  facebook:  "Facebook",
  linkedin:  "LinkedIn",
  twitter:   "Twitter",
  other:     "Other",
}

export function PlatformChart({ data }: { data: AnalyticsData }) {
  const stats = data.platformStats
  const maxCount = Math.max(...stats.map((s) => s.count), 1)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Platform breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        {stats.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No data for this period.</p>
        ) : (
          <div className="space-y-2.5">
            {stats.map((s) => {
              const bar  = Math.round((s.count / maxCount) * 100)
              const rate = Math.round(s.replyRate * 100)
              return (
                <div key={s.platform} className="flex items-center gap-3 text-sm">
                  <span className="w-20 shrink-0 text-right text-xs text-muted-foreground">
                    {PLATFORM_LABELS[s.platform] ?? s.platform}
                  </span>
                  <div className="flex-1 overflow-hidden rounded-sm bg-muted" style={{ height: "18px" }}>
                    <div
                      className="h-full rounded-sm bg-primary/70 transition-all"
                      style={{ width: `${bar}%` }}
                    />
                  </div>
                  <span className="w-24 shrink-0 text-xs text-muted-foreground">
                    {s.count}{" "}
                    <span className="text-primary">&middot; {rate}% reply</span>
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
