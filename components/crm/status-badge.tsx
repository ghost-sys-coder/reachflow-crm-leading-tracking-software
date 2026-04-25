import { cn } from "@/lib/utils"
import type { ProspectStatus } from "@/db/schema"

const STATUS_META: Record<
  ProspectStatus,
  { label: string; className: string }
> = {
  sent: {
    label: "Sent",
    className: "bg-muted text-muted-foreground ring-1 ring-inset ring-border",
  },
  waiting: {
    label: "Waiting",
    className: "bg-warning/15 text-warning ring-1 ring-inset ring-warning/30",
  },
  replied: {
    label: "Replied",
    className: "bg-primary/15 text-primary ring-1 ring-inset ring-primary/30",
  },
  booked: {
    label: "Booked",
    className: "bg-success/15 text-success ring-1 ring-inset ring-success/30",
  },
  closed: {
    label: "Closed",
    className: "bg-accent text-accent-foreground ring-1 ring-inset ring-border",
  },
  dead: {
    label: "Dead",
    className: "bg-destructive/10 text-destructive ring-1 ring-inset ring-destructive/20",
  },
}

export const PROSPECT_STATUS_LABELS = Object.fromEntries(
  Object.entries(STATUS_META).map(([k, v]) => [k, v.label]),
) as Record<ProspectStatus, string>

export function StatusBadge({
  status,
  className,
}: {
  status: ProspectStatus
  className?: string
}) {
  const meta = STATUS_META[status]
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-full px-2 text-[11px] font-medium",
        meta.className,
        className,
      )}
    >
      {meta.label}
    </span>
  )
}
