import { CalendarDays, MessageCircle, Target, TrendingUp } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import type { AnalyticsData } from "@/app/actions/analytics"

export function KpiCards({ data }: { data: AnalyticsData }) {
  const bookedCount = Math.round(data.bookingRate * data.total)

  const kpis = [
    {
      label: "Total prospects",
      value: String(data.total),
      sub: "in this period",
      icon: Target,
    },
    {
      label: "Reply rate",
      value: data.total === 0 ? "—" : `${Math.round(data.replyRate * 100)}%`,
      sub: "replied or booked",
      icon: MessageCircle,
    },
    {
      label: "Calls booked",
      value: String(bookedCount),
      sub: `${Math.round(data.bookingRate * 100)}% booking rate`,
      icon: TrendingUp,
    },
    {
      label: "New this week",
      value: String(data.newThisWeek),
      sub: "added in last 7 days",
      icon: CalendarDays,
    },
  ]

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {kpis.map((k) => (
        <Card key={k.label} size="sm" data-dashboard-stat>
          <CardContent className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <p className="pt-1 text-3xl font-semibold tracking-tight tabular-nums">{k.value}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{k.sub}</p>
            </div>
            <span className="dashboard-stat-icon inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <k.icon className="size-5" />
            </span>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
