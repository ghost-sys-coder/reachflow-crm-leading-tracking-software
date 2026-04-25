"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Search, X } from "lucide-react"

import { Input } from "@/components/ui/input"
import { MESSAGE_TYPE_LABELS } from "@/components/crm/message-meta"
import { cn } from "@/lib/utils"
import { MESSAGE_TYPES } from "@/lib/validation/schemas"
import type { MessageType } from "@/db/schema"

export type MessageState = "sent" | "draft"

export type MessageFilterCounts = {
  all: number
  type: Record<MessageType, number>
  state: Record<MessageState, number>
}

export function MessageFilterBar({
  counts,
  initialSearch,
  activeType,
  activeState,
}: {
  counts: MessageFilterCounts
  initialSearch: string
  activeType: MessageType | null
  activeState: MessageState | null
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [searchValue, setSearchValue] = React.useState(initialSearch)

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString())
    if (value === null || value === "") params.delete(key)
    else params.set(key, value)
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
          placeholder="Search content, subject, or business name..."
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
        label="State"
        items={[
          { value: null, label: "All", count: counts.all },
          { value: "sent", label: "Sent", count: counts.state.sent },
          { value: "draft", label: "Draft", count: counts.state.draft },
        ]}
        active={activeState}
        onPick={(v) => updateParam("state", v)}
      />

      <PillRow
        label="Type"
        items={[
          { value: null, label: "All" },
          ...MESSAGE_TYPES.map((t) => ({
            value: t as string,
            label: MESSAGE_TYPE_LABELS[t],
            count: counts.type[t] ?? 0,
          })),
        ]}
        active={activeType}
        onPick={(v) => updateParam("type", v)}
      />
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
