import { Suspense } from "react"

import { AddProspectDialog } from "@/components/crm/add-prospect-dialog"
import { ClearFiltersLink } from "@/components/crm/clear-filters-link"
import { EmptyState } from "@/components/crm/empty-state"
import { FilterBar, type FilterCounts } from "@/components/crm/filter-bar"
import { ProspectDetailPanel } from "@/components/crm/prospect-detail-panel"
import { ProspectListSkeleton } from "@/components/crm/prospect-list-skeleton"
import { ProspectRow } from "@/components/crm/prospect-row"
import { StatsRow } from "@/components/crm/stats-row"
import { getCurrentProfile } from "@/app/actions/profile"
import {
  getProspectById,
  getProspects,
} from "@/app/actions/prospects"
import { getUserTags } from "@/app/actions/tags"
import {
  PLATFORMS,
  PROSPECT_STATUSES,
} from "@/lib/validation/schemas"
import type { Platform, ProspectStatus } from "@/db/schema"
import type {
  Prospect,
  ProspectWithDetail,
  ProspectWithTags,
  Tag,
} from "@/types/database"

type PipelineSearchParams = {
  status?: string
  platform?: string
  q?: string
  prospect?: string
}

function parseStatus(value: string | undefined): ProspectStatus | null {
  return value && (PROSPECT_STATUSES as readonly string[]).includes(value)
    ? (value as ProspectStatus)
    : null
}

function parsePlatform(value: string | undefined): Platform | null {
  return value && (PLATFORMS as readonly string[]).includes(value)
    ? (value as Platform)
    : null
}

function computeStats(all: Prospect[]) {
  const total = all.length
  const replied = all.filter((p) => p.status === "replied").length
  const booked = all.filter((p) => p.status === "booked").length
  const replyRate = total === 0 ? 0 : (replied + booked) / total

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const thisWeek = all.filter(
    (p) => new Date(p.created_at).getTime() >= weekAgo,
  ).length

  return { total, replyRate, booked, thisWeek }
}

function computeCounts(all: Prospect[]): FilterCounts {
  const status = Object.fromEntries(
    PROSPECT_STATUSES.map((s) => [s, 0]),
  ) as FilterCounts["status"]
  const platform = Object.fromEntries(
    PLATFORMS.map((p) => [p, 0]),
  ) as FilterCounts["platform"]

  for (const p of all) {
    if (p.status in status) status[p.status as ProspectStatus] += 1
    if (p.platform in platform) platform[p.platform as Platform] += 1
  }

  return { all: all.length, status, platform }
}

function filterProspects(
  all: Prospect[],
  filters: {
    status: ProspectStatus | null
    platform: Platform | null
    search: string
  },
): Prospect[] {
  const term = filters.search.trim().toLowerCase()
  return all.filter((p) => {
    if (filters.status && p.status !== filters.status) return false
    if (filters.platform && p.platform !== filters.platform) return false
    if (term) {
      const hay = [
        p.business_name,
        p.handle,
        p.industry,
        p.location,
        p.notes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      if (!hay.includes(term)) return false
    }
    return true
  })
}

function buildIndustrySuggestions(all: Prospect[]): string[] {
  const set = new Set<string>()
  for (const p of all) if (p.industry) set.add(p.industry)
  return Array.from(set).sort()
}

async function attachTags(
  prospects: Prospect[],
  allTags: Tag[],
): Promise<ProspectWithTags[]> {
  //Phase 4 keeps tag join shallow: we fetch the user's tags but do
  //not yet preload prospect_tags per row. Detail panel loads full
  //tags itself. For list UI we leave tags empty to avoid N+1.
  void allTags
  return prospects.map((p) => ({ ...p, tags: [] }))
}

export default async function PipelinePage({
  searchParams,
}: {
  searchParams: Promise<PipelineSearchParams>
}) {
  const params = await searchParams
  const status = parseStatus(params.status)
  const platform = parsePlatform(params.platform)
  const search = params.q ?? ""

  const [allResult, tagsResult, profileResult] = await Promise.all([
    getProspects({}),
    getUserTags(),
    getCurrentProfile(),
  ])

  const all = allResult.data ?? []
  const allTags = tagsResult.data ?? []
  const agencyReady = Boolean(profileResult.data?.agency_name)
  const industrySuggestions = buildIndustrySuggestions(all)
  const stats = computeStats(all)
  const counts = computeCounts(all)

  const filtered = filterProspects(all, { status, platform, search })
  const prospects = await attachTags(filtered, allTags)

  const selectedProspect = params.prospect
    ? await getProspectById(params.prospect)
    : null
  const selected: ProspectWithDetail | null = selectedProspect?.data ?? null

  const hasAnyProspects = all.length > 0
  const hasFilters = Boolean(status || platform || search)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Pipeline</h2>
          <p className="text-sm text-muted-foreground">
            Every prospect, every status, one view.
          </p>
        </div>
        <AddProspectDialog industrySuggestions={industrySuggestions} />
      </div>

      <StatsRow {...stats} />

      {hasAnyProspects ? (
        <>
          <FilterBar
            counts={counts}
            initialSearch={search}
            activeStatus={status}
            activePlatform={platform}
          />

          <Suspense fallback={<ProspectListSkeleton />}>
            <div className="space-y-2">
              {prospects.length === 0 ? (
                <EmptyState
                  title="No prospects match these filters"
                  description="Try clearing the filters or widening your search."
                  action={<ClearFiltersLink />}
                />
              ) : (
                prospects.map((p) => <ProspectRow key={p.id} prospect={p} />)
              )}
            </div>
          </Suspense>

          <p className="text-center text-xs text-muted-foreground">
            Showing {prospects.length} of {all.length} prospects
            {hasFilters ? " (filtered)" : ""}.
          </p>
        </>
      ) : (
        <EmptyState
          title="Add your first prospect"
          description="Capture the business name, platform, and a note. Generate personalized outreach in seconds."
          action={<AddProspectDialog industrySuggestions={industrySuggestions} triggerLabel="Add your first prospect" />}
        />
      )}

      <ProspectDetailPanel
        prospect={selected}
        allTags={allTags}
        industrySuggestions={industrySuggestions}
        agencyReady={agencyReady}
      />
    </div>
  )
}
