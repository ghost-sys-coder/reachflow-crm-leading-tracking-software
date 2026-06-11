"use client"

import * as React from "react"
import Link from "next/link"
import { ExternalLink, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { DeleteProspectButton } from "@/components/crm/delete-prospect-button"
import { GenerateSheet } from "@/components/crm/generate-sheet"
import { PlatformIcon, PLATFORM_LABELS } from "@/components/crm/platform-icon"
import { StatusBadge } from "@/components/crm/status-badge"
import { StatusMenu } from "@/components/crm/status-menu"
import { TagPill } from "@/components/crm/tag-pill"
import { bulkDeleteProspects } from "@/app/actions/prospects"
import type { Platform } from "@/db/schema"
import type { ProspectWithTags, TeamMember } from "@/types/database"

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
  teamMembers,
  isAdmin,
}: {
  prospects: ProspectWithTags[]
  agencyReady: boolean
  teamMembers: TeamMember[]
  isAdmin: boolean
}) {
  const router = useRouter()
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [isDeleting, startTransition] = React.useTransition()

  if (prospects.length === 0) return null

  const allSelected = selectedIds.size === prospects.length && prospects.length > 0
  const someSelected = selectedIds.size > 0 && !allSelected

  function toggleAll() {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(prospects.map((p) => p.id)))
    }
  }

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleBulkDelete() {
    const ids = Array.from(selectedIds)
    startTransition(async () => {
      const result = await bulkDeleteProspects(ids)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success(`${result.data!.count} prospect${result.data!.count === 1 ? "" : "s"} deleted`)
      setSelectedIds(new Set())
      setConfirmOpen(false)
      router.refresh()
    })
  }

  return (
    <div className="space-y-2">
      {isAdmin && selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/50 px-4 py-2.5">
          <span className="text-sm font-medium">
            {selectedIds.size} selected
          </span>
          <div className="flex items-center gap-1.5 ml-auto">
            {!allSelected && (
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={toggleAll}
              >
                Select all {prospects.length}
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => setSelectedIds(new Set())}
            >
              Clear
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="xs"
              onClick={() => setConfirmOpen(true)}
            >
              <Trash2 />
              Delete {selectedIds.size}
            </Button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-160 text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              {isAdmin && (
                <th className="w-10 px-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected
                    }}
                    onChange={toggleAll}
                    aria-label="Select all"
                    className="size-4 cursor-pointer rounded border-border accent-primary"
                  />
                </th>
              )}
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
              <ProspectTableRow
                key={p.id}
                prospect={p}
                agencyReady={agencyReady}
                teamMembers={teamMembers}
                isAdmin={isAdmin}
                isSelected={selectedIds.has(p.id)}
                onToggle={toggleOne}
              />
            ))}
          </tbody>
        </table>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {selectedIds.size} prospect{selectedIds.size === 1 ? "" : "s"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the selected prospects, all their notes, messages, and tag
              links. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleBulkDelete()
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : `Delete ${selectedIds.size}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function ProspectTableRow({
  prospect,
  agencyReady,
  teamMembers,
  isAdmin,
  isSelected,
  onToggle,
}: {
  prospect: ProspectWithTags
  agencyReady: boolean
  teamMembers: TeamMember[]
  isAdmin: boolean
  isSelected: boolean
  onToggle: (id: string) => void
}) {
  const platform = prospect.platform as Platform
  const lastContacted = prospect.last_contacted_at
    ? formatRelative(new Date(prospect.last_contacted_at))
    : null

  return (
    <tr
      className="group/row bg-card transition-colors hover:bg-muted/30 data-[selected=true]:bg-primary/5"
      data-selected={isSelected}
    >
      {isAdmin && (
        <td
          className="w-10 px-3 py-3"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggle(prospect.id)}
            aria-label={`Select ${prospect.business_name}`}
            className="size-4 cursor-pointer rounded border-border accent-primary"
          />
        </td>
      )}

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
