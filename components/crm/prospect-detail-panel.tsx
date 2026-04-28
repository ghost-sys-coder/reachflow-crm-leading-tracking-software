"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Calendar, Clock, ExternalLink, Mail, MapPin, Pencil } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { DeleteProspectButton } from "@/components/crm/delete-prospect-button"
import { EditProspectDialog } from "@/components/crm/edit-prospect-dialog"
import { GeneratorPanel } from "@/components/crm/generator-panel"
import { PlatformIcon, PLATFORM_LABELS } from "@/components/crm/platform-icon"
import { ProspectNotes } from "@/components/crm/prospect-notes"
import { PROSPECT_STATUS_LABELS, StatusBadge } from "@/components/crm/status-badge"
import { TAG_COLOR_OPTIONS, TagPill } from "@/components/crm/tag-pill"
import { TagManager } from "@/components/crm/tag-manager"
import { updateProspectStatus } from "@/app/actions/prospects"
import { AssigneePicker } from "@/components/crm/assignee-picker"
import { cn } from "@/lib/utils"
import type { Platform, ProspectStatus } from "@/db/schema"
import type { ProspectWithDetail, Tag, TeamMember } from "@/types/database"

const QUICK_STATUSES: ProspectStatus[] = ["replied", "booked", "waiting", "dead"]

function formatDateTime(value: string | Date | null) {
  if (!value) return null
  const date = typeof value === "string" ? new Date(value) : value
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

export function ProspectDetailPanel({
  prospect,
  allTags,
  industrySuggestions,
  agencyReady,
  teamMembers,
  isAdmin,
}: {
  prospect: ProspectWithDetail | null
  allTags: Tag[]
  industrySuggestions: string[]
  agencyReady: boolean
  teamMembers: TeamMember[]
  isAdmin: boolean
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [editOpen, setEditOpen] = React.useState(false)
  const [isPending, startTransition] = React.useTransition()

  const open = Boolean(prospect)

  function handleOpenChange(next: boolean) {
    if (!next) {
      const params = new URLSearchParams(searchParams.toString())
      params.delete("prospect")
      const qs = params.toString()
      router.push(qs ? `?${qs}` : "?", { scroll: false })
    }
  }

  function quickSetStatus(status: ProspectStatus) {
    if (!prospect || prospect.status === status) return
    startTransition(async () => {
      const result = await updateProspectStatus(prospect.id, { status })
      if (result.error) toast.error(result.error)
      else toast.success(`Moved to ${PROSPECT_STATUS_LABELS[status]}`)
    })
  }

  return (
    <>
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 p-0 sm:max-w-xl"
        >
          {prospect ? (
            <DetailBody
              prospect={prospect}
              allTags={allTags}
              onEdit={() => setEditOpen(true)}
              quickSetStatus={quickSetStatus}
              isPending={isPending}
              onDeleted={() => handleOpenChange(false)}
              agencyReady={agencyReady}
              teamMembers={teamMembers}
              isAdmin={isAdmin}
            />
          ) : (
            <SheetHeader className="p-6">
              <SheetTitle>No prospect selected</SheetTitle>
              <SheetDescription>Pick one from the list to see details.</SheetDescription>
            </SheetHeader>
          )}
        </SheetContent>
      </Sheet>

      {prospect && (
        <EditProspectDialog
          prospect={prospect}
          open={editOpen}
          onOpenChange={setEditOpen}
          industrySuggestions={industrySuggestions}
        />
      )}
    </>
  )
}

function DetailBody({
  prospect,
  allTags,
  onEdit,
  quickSetStatus,
  isPending,
  onDeleted,
  agencyReady,
  teamMembers,
  isAdmin,
}: {
  prospect: ProspectWithDetail
  allTags: Tag[]
  onEdit: () => void
  quickSetStatus: (status: ProspectStatus) => void
  isPending: boolean
  onDeleted: () => void
  agencyReady: boolean
  teamMembers: TeamMember[]
  isAdmin: boolean
}) {
  const platform = prospect.platform as Platform
  const status = prospect.status as ProspectStatus
  const isEmailPlatform = platform === "email"

  return (
    <>
      <SheetHeader className="border-b border-border p-6">
        <div className="flex items-start gap-4">
          <span className="inline-flex size-11 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <PlatformIcon platform={platform} className="size-5" />
          </span>
          <div className="min-w-0 flex-1 space-y-1.5">
            <SheetTitle className="flex items-center gap-2 text-lg leading-tight">
              {prospect.business_name}
            </SheetTitle>
            <SheetDescription className="flex flex-wrap items-center gap-2">
              <StatusBadge status={status} />
              {prospect.industry && <span className="text-xs">{prospect.industry}</span>}
              {prospect.location && (
                <span className="text-xs text-muted-foreground">· {prospect.location}</span>
              )}
            </SheetDescription>
          </div>
        </div>
      </SheetHeader>

      <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
        <section className="space-y-2">
          <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Quick actions
          </h3>
          <div className="flex flex-wrap gap-2">
            {QUICK_STATUSES.map((s) => (
              <Button
                key={s}
                type="button"
                variant={status === s ? "default" : "outline"}
                size="xs"
                disabled={isPending}
                onClick={() => quickSetStatus(s)}
              >
                Mark as {PROSPECT_STATUS_LABELS[s].toLowerCase()}
              </Button>
            ))}
            <Button type="button" variant="outline" size="xs" onClick={onEdit}>
              <Pencil />
              Edit
            </Button>
            <DeleteProspectButton
              prospectId={prospect.id}
              prospectName={prospect.business_name}
              onDeleted={onDeleted}
            />
          </div>
        </section>

        <Separator />

        <section className="space-y-2">
          <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Assigned to
          </h3>
          {isAdmin ? (
            <AssigneePicker
              prospectId={prospect.id}
              currentAssigneeId={prospect.assigned_to ?? null}
              teamMembers={teamMembers}
            />
          ) : (
            <p className="text-sm text-foreground">
              {teamMembers.find((m) => m.user_id === prospect.assigned_to)?.full_name
                ?? teamMembers.find((m) => m.user_id === prospect.assigned_to)?.email
                ?? <span className="text-muted-foreground">Unassigned</span>}
            </p>
          )}
        </section>

        <Separator />

        <section className="space-y-2">
          <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Contact
          </h3>
          <dl className="grid gap-2 text-sm">
            <InfoRow
              icon={PlatformIconSlot(platform)}
              label={PLATFORM_LABELS[platform]}
              value={prospect.handle}
              linkHref={isEmailPlatform && prospect.handle ? `mailto:${prospect.handle}` : null}
            />
            {prospect.website_url && (
              <InfoRow
                icon={<ExternalLink className="size-3.5" />}
                label="Website"
                value={prospect.website_url}
                linkHref={prospect.website_url}
              />
            )}
            {prospect.location && (
              <InfoRow
                icon={<MapPin className="size-3.5" />}
                label="Location"
                value={prospect.location}
              />
            )}
          </dl>
        </section>

        <Separator />

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Tags
            </h3>
            <TagManager
              prospectId={prospect.id}
              allTags={allTags}
              appliedTags={prospect.tags}
            />
          </div>
          {prospect.tags.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No tags yet. Add tags to organize this prospect.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {prospect.tags.map((tag) => (
                <TagPill key={tag.id} name={tag.name} color={tag.color} />
              ))}
            </div>
          )}
          <p className="text-[11px] text-muted-foreground">
            Available colors:{" "}
            {TAG_COLOR_OPTIONS.map((c) => c.label.toLowerCase()).join(", ")}.
          </p>
        </section>

        <Separator />

        <section>
          <ProspectNotes prospectId={prospect.id} initialNotes={prospect.notes} />
        </section>

        <Separator />

        <section className="space-y-2">
          <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Activity
          </h3>
          <dl className="grid gap-2 text-sm">
            <InfoRow
              icon={<Calendar className="size-3.5" />}
              label="Added"
              value={formatDateTime(prospect.created_at)}
            />
            <InfoRow
              icon={<Clock className="size-3.5" />}
              label="Last contacted"
              value={formatDateTime(prospect.last_contacted_at)}
            />
            <InfoRow
              icon={<Calendar className="size-3.5" />}
              label="Follow up"
              value={formatDateTime(prospect.follow_up_at)}
            />
          </dl>
        </section>

        <Separator />

        <section className="space-y-3">
          <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Messages
          </h3>
          <GeneratorPanel
            prospectId={prospect.id}
            messages={[...prospect.messages].sort(
              (a, b) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
            )}
            agencyReady={agencyReady}
            prospect={{
              business_name: prospect.business_name,
              handle: prospect.handle,
              platform: prospect.platform,
            }}
          />
        </section>
      </div>
    </>
  )
}

function PlatformIconSlot(platform: Platform) {
  if (platform === "email") return <Mail className="size-3.5" />
  return <PlatformIcon platform={platform} />
}

function InfoRow({
  icon,
  label,
  value,
  linkHref,
}: {
  icon: React.ReactNode
  label: string
  value: string | null
  linkHref?: string | null
}) {
  if (!value) return null

  const valueEl = linkHref ? (
    <a
      href={linkHref}
      target={linkHref.startsWith("http") ? "_blank" : undefined}
      rel={linkHref.startsWith("http") ? "noreferrer" : undefined}
      className={cn("text-sm text-foreground hover:underline")}
    >
      {value}
    </a>
  ) : (
    <span className="text-sm text-foreground">{value}</span>
  )

  return (
    <dl className="grid grid-cols-[5rem_1fr] items-start gap-2">
      <dt className="flex items-center gap-1.5 pt-0.5 text-[11px] tracking-wider text-muted-foreground uppercase">
        {icon}
        {label}
      </dt>
      <dd className="min-w-0 wrap-break-word">{valueEl}</dd>
    </dl>
  )
}
