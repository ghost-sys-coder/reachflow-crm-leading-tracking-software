"use client"

import Link from "next/link"
import { ExternalLink } from "lucide-react"

import { DeleteProspectButton } from "@/components/crm/delete-prospect-button"
import { GenerateSheet } from "@/components/crm/generate-sheet"
import { PlatformIcon, PLATFORM_LABELS } from "@/components/crm/platform-icon"
import { StatusBadge } from "@/components/crm/status-badge"
import { StatusMenu } from "@/components/crm/status-menu"
import { TagPill } from "@/components/crm/tag-pill"
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

export function ProspectTable({
  prospects,
  agencyReady,
}: {
  prospects: ProspectWithTags[]
  agencyReady: boolean
}) {
  if (prospects.length === 0) return null

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="px-4 py-2.5 text-left text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              Business
            </th>
            <th className="hidden px-4 py-2.5 text-left text-[11px] font-semibold tracking-wider text-muted-foreground uppercase sm:table-cell">
              Platform
            </th>
            <th className="px-4 py-2.5 text-left text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              Status
            </th>
            <th className="hidden px-4 py-2.5 text-left text-[11px] font-semibold tracking-wider text-muted-foreground uppercase md:table-cell">
              Industry / Location
            </th>
            <th className="hidden px-4 py-2.5 text-left text-[11px] font-semibold tracking-wider text-muted-foreground uppercase lg:table-cell">
              Tags
            </th>
            <th className="hidden px-4 py-2.5 text-right text-[11px] font-semibold tracking-wider text-muted-foreground uppercase xl:table-cell">
              Last contacted
            </th>
            <th className="px-4 py-2.5 text-right text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {prospects.map((p) => (
            <ProspectTableRow key={p.id} prospect={p} agencyReady={agencyReady} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ProspectTableRow({
  prospect,
  agencyReady,
}: {
  prospect: ProspectWithTags
  agencyReady: boolean
}) {
  const platform = prospect.platform as Platform
  const lastContacted = prospect.last_contacted_at
    ? formatRelative(new Date(prospect.last_contacted_at))
    : null

  return (
    <tr className="group/row bg-card transition-colors hover:bg-muted/30">
      <td className="max-w-50 px-4 py-3">
        <Link
          href={`/prospects/${prospect.id}`}
          className="flex items-center gap-2.5 focus-visible:outline-none"
        >
          <span className="inline-flex size-7 shrink-0 items-center justify-center rounded bg-muted text-muted-foreground">
            <PlatformIcon platform={platform} className="size-3.5" />
          </span>
          <span className="truncate font-medium text-foreground group-hover/row:text-primary">
            {prospect.business_name}
          </span>
          <ExternalLink className="size-3 shrink-0 opacity-0 transition-opacity group-hover/row:opacity-40" />
        </Link>
      </td>

      <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
        {PLATFORM_LABELS[platform]}
      </td>

      <td className="px-4 py-3">
        <StatusBadge status={prospect.status as Parameters<typeof StatusBadge>[0]["status"]} />
      </td>

      <td className="hidden max-w-45 px-4 py-3 text-muted-foreground md:table-cell">
        <p className="truncate text-xs">
          {[prospect.industry, prospect.location].filter(Boolean).join(" · ") ||
            prospect.handle ||
            "—"}
        </p>
      </td>

      <td className="hidden px-4 py-3 lg:table-cell">
        {prospect.tags.length === 0 ? (
          <span className="text-xs text-muted-foreground">—</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {prospect.tags.slice(0, 2).map((tag) => (
              <TagPill key={tag.id} name={tag.name} color={tag.color} />
            ))}
            {prospect.tags.length > 2 && (
              <span className="text-[11px] text-muted-foreground">
                +{prospect.tags.length - 2}
              </span>
            )}
          </div>
        )}
      </td>

      <td className="hidden px-4 py-3 text-right text-xs text-muted-foreground xl:table-cell">
        {lastContacted ?? "—"}
      </td>

      <td className="px-4 py-3 text-right">
        <div
          className="flex items-center justify-end gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <GenerateSheet prospect={prospect} agencyReady={agencyReady} />
          <StatusMenu prospect={prospect} />
          <DeleteProspectButton
            prospectId={prospect.id}
            prospectName={prospect.business_name}
          />
        </div>
      </td>
    </tr>
  )
}
