import Link from "next/link"
import {
  FilePlus,
  ArrowRightLeft,
  UserCheck,
  StickyNote,
  Pencil,
  Send,
  MessageSquare,
  ShieldOff,
} from "lucide-react"

import { getOrgActivityLog, type OrgActivityEntry } from "@/app/actions/activity-log"

const ACTION_LABELS: Record<string, string> = {
  prospect_created: "Prospect added",
  status_changed:   "Status changed",
  assignee_changed: "Assignee changed",
  note_updated:     "Notes updated",
  prospect_updated: "Details edited",
  message_saved:    "Draft saved",
  outreach_sent:    "Outreach sent",
}

const ACTION_COLORS: Record<string, string> = {
  prospect_created: "bg-emerald-500/10 text-emerald-600",
  status_changed:   "bg-blue-500/10 text-blue-600",
  assignee_changed: "bg-violet-500/10 text-violet-600",
  note_updated:     "bg-amber-500/10 text-amber-600",
  prospect_updated: "bg-zinc-500/10 text-zinc-600",
  message_saved:    "bg-sky-500/10 text-sky-600",
  outreach_sent:    "bg-primary/10 text-primary",
}

const MESSAGE_TYPE_LABELS: Record<string, string> = {
  instagram_dm: "Instagram DM",
  cold_email:   "Cold email",
  follow_up:    "Follow-up",
  custom:       "Custom",
}

function ActionIcon({ action }: { action: string }) {
  const cls = "size-3.5 shrink-0"
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

function formatDetail(entry: OrgActivityEntry): string | null {
  switch (entry.action) {
    case "status_changed":
      if (entry.old_value && entry.new_value)
        return `${entry.old_value} → ${entry.new_value}`
      return entry.new_value ?? null
    case "message_saved":
    case "outreach_sent":
      return entry.new_value ? (MESSAGE_TYPE_LABELS[entry.new_value] ?? entry.new_value) : null
    case "prospect_created":
      return entry.new_value ?? null
    default:
      return null
  }
}

function formatDate(value: string | Date): string {
  return new Date(value).toLocaleString("en-GB", {
    day:    "2-digit",
    month:  "short",
    year:   "numeric",
    hour:   "2-digit",
    minute: "2-digit",
    hour12: false,
  })
}

export default async function ActivityPage() {
  const result = await getOrgActivityLog()

  if (result.error) {
    return (
      <div className="py-20 text-center text-sm text-muted-foreground">
        Could not load activity log: {result.error}
      </div>
    )
  }

  const { entries, isAdmin } = result.data!

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <ShieldOff className="mb-4 size-10 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Admin access required</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Only organisation admins can view the activity log.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Activity Log</h2>
        <p className="text-sm text-muted-foreground">
          Every action taken across your organisation — last 200 events.
        </p>
      </div>

      {entries.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-20 text-center text-sm text-muted-foreground">
          No activity recorded yet. Actions on prospects will appear here.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase">
                  Action
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase">
                  Prospect
                </th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase sm:table-cell">
                  Detail
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase">
                  By
                </th>
                <th className="hidden px-4 py-3 text-right text-xs font-medium tracking-wider text-muted-foreground uppercase md:table-cell">
                  When
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {entries.map((entry) => {
                const detail = formatDetail(entry)
                const colorCls = ACTION_COLORS[entry.action] ?? "bg-muted text-muted-foreground"
                return (
                  <tr key={entry.id} className="transition-colors hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${colorCls}`}
                      >
                        <ActionIcon action={entry.action} />
                        {ACTION_LABELS[entry.action] ?? entry.action}
                      </span>
                    </td>
                    <td className="max-w-[160px] truncate px-4 py-3">
                      {entry.prospect ? (
                        <Link
                          href={`/prospects/${entry.prospect.id}`}
                          className="font-medium text-foreground hover:underline"
                        >
                          {entry.prospect.business_name}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="hidden max-w-[200px] truncate px-4 py-3 text-muted-foreground sm:table-cell">
                      {detail ?? <span className="text-muted-foreground/50">—</span>}
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      {entry.actor_name}
                    </td>
                    <td className="hidden whitespace-nowrap px-4 py-3 text-right text-xs text-muted-foreground md:table-cell">
                      {formatDate(entry.created_at)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
