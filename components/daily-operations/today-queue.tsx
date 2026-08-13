"use client"

import * as React from "react"
import Link from "next/link"
import { AlarmClock, CalendarCheck2, CheckCircle2, Clock3, History } from "lucide-react"
import { toast } from "sonner"

import { snoozeProspect, type TodayProspect } from "@/app/actions/daily-operations"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

const QUEUE_ICONS = {
  overdue: { icon: AlarmClock, className: "bg-destructive/10 text-destructive ring-destructive/15" },
  today: { icon: CalendarCheck2, className: "bg-primary/10 text-primary ring-primary/15" },
  stale: { icon: History, className: "bg-warning/10 text-warning ring-warning/15" },
}

export function TodayQueue({ initialQueue }: { initialQueue: TodayProspect[] }) {
  const [queue, setQueue] = React.useState(initialQueue)
  const [snoozing, setSnoozing] = React.useState<string | null>(null)

  function snooze(id: string) {
    setSnoozing(id)
    React.startTransition(async () => {
      const result = await snoozeProspect(id, 1, "Snoozed from Today")
      setSnoozing(null)
      if (result.error) { toast.error(result.error); return }
      setQueue((items) => items.filter((item) => item.id !== id))
      toast.success("Snoozed until tomorrow")
    })
  }

  if (!queue.length) return <div className="rounded-xl border border-dashed py-16 text-center"><CheckCircle2 className="mx-auto size-8 text-success"/><p className="mt-3 font-medium">You are caught up.</p><p className="mt-1 text-sm text-muted-foreground">No overdue, due-today, or stale prospects need attention.</p></div>
  return <div className="space-y-3">{queue.map((prospect) => { const meta = QUEUE_ICONS[prospect.queue_reason]; const QueueIcon = meta.icon; return <article key={prospect.id} className="flex flex-col gap-4 rounded-xl border bg-card p-4 sm:flex-row sm:items-center"><div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ring-1 ${meta.className}`}><QueueIcon className="size-5"/></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{prospect.business_name}</h3><Badge variant={prospect.queue_reason === "overdue" ? "destructive" : "outline"}>{prospect.queue_reason.replace("stale", "needs attention")}</Badge></div><p className="mt-1 text-xs text-muted-foreground">{prospect.follow_up_at ? `Follow-up ${new Date(prospect.follow_up_at).toLocaleString()}` : `Last activity ${new Date(prospect.last_contacted_at ?? prospect.created_at).toLocaleDateString()}`}</p></div><div className="flex gap-2"><Button asChild size="sm"><Link href={`/pipeline?prospect=${prospect.id}`}>Work prospect</Link></Button><Button size="sm" variant="outline" disabled={snoozing === prospect.id} onClick={() => snooze(prospect.id)}><Clock3 />Tomorrow</Button></div></article> })}</div>
}
