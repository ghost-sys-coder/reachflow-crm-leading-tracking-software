import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { AnalyticsData } from "@/app/actions/analytics"
import type { ProspectStatus } from "@/db/schema"
import { PROSPECT_STATUSES } from "@/lib/validation/schemas"

const STATUS_META: Record<ProspectStatus, { label: string; color: string }> = {
  sent:    { label: "Sent",    color: "bg-blue-500"    },
  waiting: { label: "Waiting", color: "bg-amber-400"   },
  replied: { label: "Replied", color: "bg-emerald-500" },
  booked:  { label: "Booked",  color: "bg-green-600"   },
  closed:  { label: "Closed",  color: "bg-slate-400"   },
  dead:    { label: "Dead",    color: "bg-red-400"     },
}

export function StatusFunnel({ data }: { data: AnalyticsData }) {
  const counts = data.statusCounts
  const maxCount = Math.max(...Object.values(counts), 1)
  const total = data.total

  return (
    <Card>
      <CardHeader>
        <CardTitle>Status breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No data for this period.</p>
        ) : (
          <div className="space-y-2.5">
            {PROSPECT_STATUSES.map((status) => {
              const count = counts[status]
              const pct   = Math.round((count / total) * 100)
              const bar   = Math.round((count / maxCount) * 100)
              const meta  = STATUS_META[status]
              return (
                <div key={status} className="flex items-center gap-3 text-sm">
                  <span className="w-14 shrink-0 text-right text-xs text-muted-foreground">
                    {meta.label}
                  </span>
                  <div className="flex-1 overflow-hidden rounded-sm bg-muted" style={{ height: "18px" }}>
                    <div
                      className={`h-full rounded-sm transition-all ${meta.color}`}
                      style={{ width: `${bar}%` }}
                    />
                  </div>
                  <span className="w-16 shrink-0 text-xs text-muted-foreground">
                    {count} <span className="opacity-60">({pct}%)</span>
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
