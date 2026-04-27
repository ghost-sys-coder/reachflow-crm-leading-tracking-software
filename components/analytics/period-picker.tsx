import Link from "next/link"

import { cn } from "@/lib/utils"
import type { PeriodKey } from "@/app/actions/analytics"

const OPTIONS: { key: PeriodKey; label: string }[] = [
  { key: "30d",  label: "30 days"  },
  { key: "90d",  label: "90 days"  },
  { key: "all",  label: "All time" },
]

export function PeriodPicker({ current }: { current: PeriodKey }) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-lg border border-border bg-muted/30 p-0.5">
      {OPTIONS.map(({ key, label }) => (
        <Link
          key={key}
          href={`/analytics?period=${key}`}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            key === current
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {label}
        </Link>
      ))}
    </div>
  )
}
