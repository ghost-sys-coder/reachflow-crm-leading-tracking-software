import { getTodayQueue } from "@/app/actions/daily-operations"
import { TodayQueue } from "@/components/daily-operations/today-queue"

export default async function TodayPage() {
  const result = await getTodayQueue()
  if (result.error) throw new Error(result.error)
  const queue = result.data ?? []
  return <div className="space-y-6"><header><p className="text-xs font-semibold tracking-wider text-primary uppercase">Daily command center</p><h2 className="mt-2 text-2xl font-semibold">Today</h2><p className="mt-1 text-sm text-muted-foreground">A deterministic queue: overdue first, then due today, then prospects untouched for seven days.</p></header><div className="grid gap-3 sm:grid-cols-3">{(["overdue", "today", "stale"] as const).map((reason) => <div key={reason} className="rounded-xl border bg-card p-4"><p className="text-xs capitalize text-muted-foreground">{reason}</p><p className="mt-1 text-2xl font-semibold">{queue.filter((item) => item.queue_reason === reason).length}</p></div>)}</div><TodayQueue initialQueue={queue} /></div>
}
