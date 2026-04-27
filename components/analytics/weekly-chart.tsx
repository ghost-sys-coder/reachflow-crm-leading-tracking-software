import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { AnalyticsData } from "@/app/actions/analytics"

export function WeeklyChart({ data }: { data: AnalyticsData }) {
  const weeks    = data.weeklyActivity
  const maxCount = Math.max(...weeks.map((w) => w.count), 1)

  return (
    <Card>
      <CardHeader>
        <CardTitle>New prospects — last 12 weeks</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Count labels row */}
        <div className="flex gap-1">
          {weeks.map((w, i) => (
            <div key={i} className="flex flex-1 justify-center">
              <span className="text-[9px] font-medium text-muted-foreground h-3 leading-3">
                {w.count > 0 ? w.count : ""}
              </span>
            </div>
          ))}
        </div>

        {/* Bars */}
        <div className="relative mt-0.5 flex h-28 items-end gap-1">
          {/* Grid lines */}
          {[0.25, 0.5, 0.75, 1].map((t) => (
            <div
              key={t}
              className="pointer-events-none absolute inset-x-0 border-t border-dashed border-border/40"
              style={{ bottom: `${t * 100}%` }}
            />
          ))}

          {weeks.map((w, i) => {
            const heightPct = w.count === 0 ? 0 : Math.max((w.count / maxCount) * 100, 3)
            const isCurrentWeek = i === weeks.length - 1
            return (
              <div
                key={i}
                className={`relative z-10 flex-1 rounded-t-sm transition-all ${
                  isCurrentWeek ? "bg-primary" : "bg-primary/50"
                }`}
                style={{ height: `${heightPct}%` }}
              />
            )
          })}
        </div>

        {/* Week labels — show every 4th + last */}
        <div className="mt-1.5 flex gap-1">
          {weeks.map((w, i) => {
            const show = i % 4 === 0 || i === weeks.length - 1
            return (
              <div key={i} className="flex flex-1 justify-center">
                <span className="text-[9px] text-muted-foreground">
                  {show ? w.label : ""}
                </span>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
