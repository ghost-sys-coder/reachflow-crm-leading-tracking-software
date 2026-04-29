"use client"

import { useEffect, useState } from "react"
import {
  FilePlus,
  ArrowRightLeft,
  UserCheck,
  StickyNote,
  Pencil,
  Send,
  MessageSquare,
  Loader2,
} from "lucide-react"

import { getActivityLog } from "@/app/actions/activity-log"
import type { ActivityLog } from "@/types/database"

const ACTION_LABELS: Record<string, string> = {
  prospect_created: "Added prospect",
  status_changed:   "Status changed",
  assignee_changed: "Assignee changed",
  note_updated:     "Notes updated",
  prospect_updated: "Details edited",
  message_saved:    "Draft saved",
  outreach_sent:    "Outreach sent",
}

const MESSAGE_TYPE_LABELS: Record<string, string> = {
  instagram_dm: "Instagram DM",
  cold_email:   "cold email",
  follow_up:    "follow-up",
  custom:       "custom message",
}

function ActionIcon({ action }: { action: string }) {
  const cls = "size-3 shrink-0"
  switch (action) {
    case "prospect_created": return <FilePlus className={cls} />
    case "status_changed":   return <ArrowRightLeft className={cls} />
    case "assignee_changed": return <UserCheck className={cls} />
    case "note_updated":     return <StickyNote className={cls} />
    case "prospect_updated": return <Pencil className={cls} />
    case "message_saved":    return <MessageSquare className={cls} />
    case "outreach_sent":    return <Send className={cls} />
    default:                 return <Pencil className={cls} />
  }
}

function formatDetail(entry: ActivityLog): string | null {
  switch (entry.action) {
    case "status_changed":
      if (entry.old_value && entry.new_value)
        return `${entry.old_value} → ${entry.new_value}`
      if (entry.new_value) return entry.new_value
      return null
    case "message_saved":
    case "outreach_sent":
      return entry.new_value ? (MESSAGE_TYPE_LABELS[entry.new_value] ?? entry.new_value) : null
    case "prospect_created":
      return entry.new_value ?? null
    default:
      return null
  }
}

function timeAgo(date: string | Date): string {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

export function ActivityTimeline({ prospectId }: { prospectId: string }) {
  const [entries, setEntries] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getActivityLog(prospectId).then(({ data }) => {
      setEntries(data ?? [])
      setLoading(false)
    })
  }, [prospectId])

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="size-3 animate-spin" />
        Loading history…
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">No activity recorded yet.</p>
    )
  }

  return (
    <ol className="relative space-y-0 border-l border-border">
      {entries.map((entry, i) => {
        const detail = formatDetail(entry)
        const isLast = i === entries.length - 1

        return (
          <li key={entry.id} className={`relative pl-5 ${isLast ? "pb-0" : "pb-4"}`}>
            <span className="absolute -left-2.25 top-0.5 flex size-4.5 items-center justify-center rounded-full border border-border bg-background text-muted-foreground">
              <ActionIcon action={entry.action} />
            </span>
            <p className="text-sm font-medium leading-none">
              {ACTION_LABELS[entry.action] ?? entry.action}
            </p>
            {detail && (
              <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>
            )}
            <p className="mt-1 text-[11px] text-muted-foreground">
              {entry.actor_name} · {timeAgo(entry.created_at)}
            </p>
          </li>
        )
      })}
    </ol>
  )
}
