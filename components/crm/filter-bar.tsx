"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Search, X } from "lucide-react"

import { Input } from "@/components/ui/input"
import { PLATFORM_LABELS } from "@/components/crm/platform-icon"
import { PROSPECT_STATUS_LABELS } from "@/components/crm/status-badge"
import { cn } from "@/lib/utils"
import { PLATFORMS, PROSPECT_STATUSES } from "@/lib/validation/schemas"
import type { Platform, ProspectStatus } from "@/db/schema"

export type FilterCounts = {
  all: number
  status: Record<ProspectStatus, number>
  platform: Record<Platform, number>
  mine?: number
}

export function FilterBar({
  counts,
  initialSearch,
  activeStatus,
  activePlatform,
  activeAssignedToMe = false,
}: {
  counts: FilterCounts
  initialSearch: string
  activeStatus: ProspectStatus | null
  activePlatform: Platform | null
  activeAssignedToMe?: boolean
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [searchValue, setSearchValue] = React.useState(initialSearch)

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString())
    if (value === null || value === "") params.delete(key)
    else params.set(key, value)
    params.delete("prospect")
    const qs = params.toString()
    router.push(qs ? `?${qs}` : "?", { scroll: false })
  }

  React.useEffect(() => {
    const handle = setTimeout(() => {
      if (searchValue !== initialSearch) {
        updateParam("q", searchValue.trim() || null)
      }
    }, 300)
    return () => clearTimeout(handle)
    //eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue])

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute top-2.5 left-2.5 size-3.5 text-muted-foreground" />
        <Input
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          placeholder="Search business, handle, industry, location..."
          className="pl-8"
        />
        {searchValue && (
          <button
            type="button"
            onClick={() => {
              setSearchValue("")
              updateParam("q", null)
            }}
            aria-label="Clear search"
            className="absolute top-2.5 right-2.5 text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      <PillRow
        label="Status"
        items={[
          { value: null, label: "All", count: counts.all },
          ...PROSPECT_STATUSES.map((s) => ({
            value: s as string,
            label: PROSPECT_STATUS_LABELS[s],
            count: counts.status[s] ?? 0,
          })),
        ]}
        active={activeStatus}
        onPick={(v) => updateParam("status", v)}
      />

      <PillRow
        label="Platform"
        items={[
          { value: null, label: "All" },
          ...PLATFORMS.map((p) => ({
            value: p as string,
            label: PLATFORM_LABELS[p],
            count: counts.platform[p] ?? 0,
          })),
        ]}
        active={activePlatform}
        onPick={(v) => updateParam("platform", v)}
      />

      {typeof counts.mine === "number" && (
        <PillRow
          label="Assigned"
          items={[
            { value: null, label: "All" },
            { value: "me", label: "Mine", count: counts.mine },
          ]}
          active={activeAssignedToMe ? "me" : null}
          onPick={(v) => updateParam("assigned", v)}
        />
      )}
    </div>
  )
}

function PillRow({
  label,
  items,
  active,
  onPick,
}: {
  label: string
  items: Array<{ value: string | null; label: string; count?: number }>
  active: string | null
  onPick: (value: string | null) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
        {label}
      </span>
      {items.map((item) => {
        const isActive = item.value === active
        return (
          <button
            key={item.label}
            type="button"
            onClick={() => onPick(item.value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
              isActive
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground",
            )}
          >
            {item.label}
            {typeof item.count === "number" && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-px text-[10px] font-medium",
                  isActive
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {item.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
