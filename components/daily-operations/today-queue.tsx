"use client"

import * as React from "react"
import Link from "next/link"
import { Clock3 } from "lucide-react"
import { toast } from "sonner"

import { snoozeProspect, type TodayProspect } from "@/app/actions/daily-operations"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

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

  if (!queue.length) return <div className="rounded-xl border border-dashed py-16 text-center"><p className="font-medium">You are caught up.</p><p className="mt-1 text-sm text-muted-foreground">No overdue, due-today, or stale prospects need attention.</p></div>
  return <div className="space-y-3">{queue.map((prospect, index) => <article key={prospect.id} className="flex flex-col gap-4 rounded-xl border bg-card p-4 sm:flex-row sm:items-center"><div className="flex size-8 items-center justify-center rounded-full bg-muted text-xs font-semibold">{index + 1}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{prospect.business_name}</h3><Badge variant={prospect.queue_reason === "overdue" ? "destructive" : "outline"}>{prospect.queue_reason}</Badge></div><p className="mt-1 text-xs text-muted-foreground">{prospect.follow_up_at ? `Follow-up ${new Date(prospect.follow_up_at).toLocaleString()}` : `Last activity ${new Date(prospect.last_contacted_at ?? prospect.created_at).toLocaleDateString()}`}</p></div><div className="flex gap-2"><Button asChild size="sm"><Link href={`/pipeline?prospect=${prospect.id}`}>Work prospect</Link></Button><Button size="sm" variant="outline" disabled={snoozing === prospect.id} onClick={() => snooze(prospect.id)}><Clock3 />Tomorrow</Button></div></article>)}</div>
}
