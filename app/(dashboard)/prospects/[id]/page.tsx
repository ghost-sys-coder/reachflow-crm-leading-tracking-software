import { notFound } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  Calendar,
  Clock,
  ExternalLink,
  Mail,
  MapPin,
} from "lucide-react"

import { Separator } from "@/components/ui/separator"
import { GeneratorPanel } from "@/components/crm/generator-panel"
import { ProspectDetailActions } from "@/components/crm/prospect-detail-actions"
import { PlatformIcon, PLATFORM_LABELS } from "@/components/crm/platform-icon"
import { ProspectNotes } from "@/components/crm/prospect-notes"
import { StatusBadge } from "@/components/crm/status-badge"
import { TAG_COLOR_OPTIONS, TagPill } from "@/components/crm/tag-pill"
import { TagManager } from "@/components/crm/tag-manager"
import { getCurrentProfile } from "@/app/actions/profile"
import { getProspectById } from "@/app/actions/prospects"
import { getUserTags } from "@/app/actions/tags"
import { getProspects } from "@/app/actions/prospects"
import { cn } from "@/lib/utils"
import type { Platform, ProspectStatus } from "@/db/schema"

function formatDateTime(value: string | Date | null) {
  if (!value) return null
  const date = typeof value === "string" ? new Date(value) : value
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
}

function buildIndustrySuggestions(data: { industry: string | null }[]): string[] {
  const set = new Set<string>()
  for (const p of data) if (p.industry) set.add(p.industry)
  return Array.from(set).sort()
}

export default async function ProspectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [prospectResult, tagsResult, allProspectsResult, profileResult] =
    await Promise.all([
      getProspectById(id),
      getUserTags(),
      getProspects({}),
      getCurrentProfile(),
    ])

  if (prospectResult.error || !prospectResult.data) notFound()

  const prospect = prospectResult.data
  const allTags = tagsResult.data ?? []
  const industrySuggestions = buildIndustrySuggestions(allProspectsResult.data ?? [])
  const agencyReady = Boolean(profileResult.data?.agency_name)

  //newest-first to match the generator panel's history ordering
  const sortedMessages = [...prospect.messages].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )

  const platform = prospect.platform as Platform
  const status = prospect.status as ProspectStatus
  const isEmailPlatform = platform === "email"

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/prospects"
          className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to Prospects
        </Link>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <PlatformIcon platform={platform} className="size-5" />
            </span>
            <div className="space-y-1">
              <h2 className="text-2xl font-semibold tracking-tight">
                {prospect.business_name}
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={status} />
                <span className="text-xs text-muted-foreground">
                  {PLATFORM_LABELS[platform]}
                </span>
                {prospect.industry && (
                  <span className="text-xs text-muted-foreground">
                    · {prospect.industry}
                  </span>
                )}
                {prospect.location && (
                  <span className="text-xs text-muted-foreground">
                    · {prospect.location}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Quick actions */}
      <section className="space-y-2">
        <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          Quick actions
        </h3>
        <ProspectDetailActions
          prospect={prospect}
          industrySuggestions={industrySuggestions}
        />
      </section>

      <Separator />

      {/* Two-column body */}
      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        {/* Left column */}
        <div className="space-y-8">
          {/* Contact */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Contact
            </h3>
            <dl className="grid gap-2 text-sm">
              <InfoRow
                icon={
                  isEmailPlatform ? (
                    <Mail className="size-3.5" />
                  ) : (
                    <PlatformIcon platform={platform} className="size-3.5" />
                  )
                }
                label={PLATFORM_LABELS[platform]}
                value={prospect.handle}
                linkHref={
                  isEmailPlatform && prospect.handle
                    ? `mailto:${prospect.handle}`
                    : null
                }
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

          {/* Notes */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Notes
            </h3>
            <ProspectNotes
              prospectId={prospect.id}
              initialNotes={prospect.notes}
            />
          </section>

          <Separator />

          {/* AI generator + message history */}
          <section className="space-y-4">
            <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Messages
            </h3>
            <GeneratorPanel
              prospectId={prospect.id}
              messages={sortedMessages}
              agencyReady={agencyReady}
            />
          </section>
        </div>

        {/* Right column */}
        <div className="space-y-8">
          {/* Tags */}
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

          {/* Activity */}
          <section className="space-y-3">
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
        </div>
      </div>
    </div>
  )
}

function InfoRow({
  icon,
  label,
  value,
  linkHref,
}: {
  icon: React.ReactNode
  label: string
  value: string | null | undefined
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
    <div className="grid grid-cols-[5rem_1fr] items-start gap-2">
      <dt className="flex items-center gap-1.5 pt-0.5 text-[11px] tracking-wider text-muted-foreground uppercase">
        {icon}
        {label}
      </dt>
      <dd className="min-w-0 break-words">{valueEl}</dd>
    </div>
  )
}
