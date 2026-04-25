import { Calendar, Phone, Target, TrendingUp } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"

type StatsRowProps = {
  total: number
  replyRate: number
  booked: number
  thisWeek: number
}

export function StatsRow({ total, replyRate, booked, thisWeek }: StatsRowProps) {
  const stats = [
    { label: "Total prospects", value: String(total), icon: Target },
    {
      label: "Reply rate",
      value: total === 0 ? "—" : `${Math.round(replyRate * 100)}%`,
      icon: TrendingUp,
    },
    { label: "Calls booked", value: String(booked), icon: Phone },
    { label: "New this week", value: String(thisWeek), icon: Calendar },
  ]

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((s) => (
        <Card key={s.label} size="sm">
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="pt-1 text-2xl font-semibold tracking-tight">{s.value}</p>
            </div>
            <span className="inline-flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
              <s.icon className="size-4" />
            </span>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
