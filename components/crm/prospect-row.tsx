"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"

import { DeleteProspectButton } from "@/components/crm/delete-prospect-button"
import { TagPill } from "@/components/crm/tag-pill"
import { PlatformIcon, PLATFORM_LABELS } from "@/components/crm/platform-icon"
import { StatusBadge } from "@/components/crm/status-badge"
import { StatusMenu } from "@/components/crm/status-menu"
import type { Platform } from "@/db/schema"
import type { ProspectWithTags } from "@/types/database"

function formatRelative(date: Date) {
  const diffMs = Date.now() - date.getTime()
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return "scheduled"
  if (diffDays < 1) return "today"
  if (diffDays === 1) return "yesterday"
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.round(diffDays / 7)}w ago`
  return date.toLocaleDateString()
}

export function ProspectRow({ prospect }: { prospect: ProspectWithTags }) {
  const searchParams = useSearchParams()
  const params = new URLSearchParams(searchParams.toString())
  params.set("prospect", prospect.id)
  const href = `?${params.toString()}`

  const lastContacted = prospect.last_contacted_at
    ? formatRelative(new Date(prospect.last_contacted_at))
    : null

  return (
    <Link
      href={href}
      scroll={false}
      className="group/row flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:border-primary/30 hover:bg-muted/40"
    >
      <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <PlatformIcon platform={prospect.platform as Platform} />
      </span>

      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium">{prospect.business_name}</p>
          {prospect.tags.slice(0, 2).map((tag) => (
            <TagPill key={tag.id} name={tag.name} color={tag.color} />
          ))}
          {prospect.tags.length > 2 && (
            <span className="text-[11px] text-muted-foreground">
              +{prospect.tags.length - 2}
            </span>
          )}
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {[prospect.industry, prospect.location].filter(Boolean).join(" · ") ||
            prospect.handle ||
            PLATFORM_LABELS[prospect.platform as Platform]}
        </p>
      </div>

      {lastContacted && (
        <span className="hidden text-[11px] text-muted-foreground sm:inline">
          {lastContacted}
        </span>
      )}

      <StatusBadge status={prospect.status as Parameters<typeof StatusBadge>[0]["status"]} />

      <div
        className="flex items-center gap-1"
        onClick={(e) => e.preventDefault()}
      >
        <StatusMenu prospect={prospect} />
        <DeleteProspectButton
          prospectId={prospect.id}
          prospectName={prospect.business_name}
        />
      </div>
    </Link>
  )
}
