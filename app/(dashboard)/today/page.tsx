import { getTodayQueue } from "@/app/actions/daily-operations"
import { TodayQueue } from "@/components/daily-operations/today-queue"
import { AlarmClock, CalendarCheck2, History } from "lucide-react"

const QUEUE_SUMMARIES = [
  { reason: "overdue" as const, label: "Overdue", icon: AlarmClock, iconClass: "bg-destructive/10 text-destructive" },
  { reason: "today" as const, label: "Due today", icon: CalendarCheck2, iconClass: "bg-primary/10 text-primary" },
  { reason: "stale" as const, label: "Needs attention", icon: History, iconClass: "bg-warning/10 text-warning" },
]

export default async function TodayPage() {
  const result = await getTodayQueue()
  if (result.error) throw new Error(result.error)
  const queue = result.data ?? []
  return <div className="space-y-6"><header><p className="text-xs font-semibold tracking-wider text-primary uppercase">Daily command center</p><h2 className="mt-2 text-2xl font-semibold">Today</h2><p className="mt-1 text-sm text-muted-foreground">A deterministic queue: overdue first, then due today, then prospects untouched for seven days.</p></header><div className="grid gap-3 sm:grid-cols-3">{QUEUE_SUMMARIES.map(({ reason, label, icon: Icon, iconClass }) => <div key={reason} data-dashboard-stat className="flex items-center justify-between rounded-xl border bg-card p-4"><div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">{queue.filter((item) => item.queue_reason === reason).length}</p></div><span className={`inline-flex size-11 items-center justify-center rounded-xl ${iconClass}`}><Icon className="size-5" /></span></div>)}</div><TodayQueue initialQueue={queue} /></div>
}
