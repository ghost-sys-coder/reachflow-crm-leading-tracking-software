import { Suspense } from "react"

import { AddProspectDialog } from "@/components/crm/add-prospect-dialog"
import { ExportProspectsButton } from "@/components/crm/export-prospects-button"
import { ImportProspectsDialog } from "@/components/crm/import-prospects-dialog"
import { ClearFiltersLink } from "@/components/crm/clear-filters-link"
import { EmptyState } from "@/components/crm/empty-state"
import { FilterBar, type FilterCounts } from "@/components/crm/filter-bar"
import { ProspectListSkeleton } from "@/components/crm/prospect-list-skeleton"
import { ProspectTable } from "@/components/crm/prospect-table"
import { ProspectPagination } from "@/components/crm/prospect-pagination"
import { StatsRow } from "@/components/crm/stats-row"
import { getCurrentOrg } from "@/app/actions/profile"
import { getProspects } from "@/app/actions/prospects"
import { getUserTags } from "@/app/actions/tags"
import { getOrgIndustries, getOrgCustomPlatforms } from "@/app/actions/custom-fields"
import { getCampaignOptions } from "@/app/actions/campaigns"
import { getAuthedOrgClient } from "@/lib/auth/org"
import { getSavedViews } from "@/app/actions/daily-operations"
import { SavedViewsBar } from "@/components/crm/saved-views-bar"
import { PLATFORMS, PROSPECT_STATUSES } from "@/lib/validation/schemas"
import type { Platform, ProspectStatus } from "@/db/schema"
import type { Prospect, ProspectWithTags, Tag } from "@/types/database"

type ProspectsSearchParams = {
  status?: string
  platform?: string
  q?: string
  assigned?: string
  page?: string
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
  const thisWeek = all.filter((p) => new Date(p.created_at).getTime() >= weekAgo).length
  return { total, replyRate, booked, thisWeek }
}

function computeCounts(all: Prospect[], currentUserId: string): FilterCounts {
  const status = Object.fromEntries(
    PROSPECT_STATUSES.map((s) => [s, 0]),
  ) as FilterCounts["status"]
  const platform = Object.fromEntries(
    PLATFORMS.map((p) => [p, 0]),
  ) as FilterCounts["platform"]
  let mine = 0
  for (const p of all) {
    if (p.status in status) status[p.status as ProspectStatus] += 1
    if (p.platform in platform) platform[p.platform as Platform] += 1
    if (p.assigned_to === currentUserId) mine += 1
  }
  return { all: all.length, status, platform, mine }
}

function filterProspects(
  all: Prospect[],
  filters: {
    status: ProspectStatus | null
    platform: Platform | null
    search: string
    assignedToUserId: string | null
  },
): Prospect[] {
  const term = filters.search.trim().toLowerCase()
  return all.filter((p) => {
    if (filters.status && p.status !== filters.status) return false
    if (filters.platform && p.platform !== filters.platform) return false
    if (filters.assignedToUserId && p.assigned_to !== filters.assignedToUserId) return false
    if (term) {
      const hay = [p.business_name, p.handle, p.industry, p.location, p.notes]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      if (!hay.includes(term)) return false
    }
    return true
  })
}

function attachTags(prospects: Prospect[], _allTags: Tag[]): ProspectWithTags[] { // eslint-disable-line @typescript-eslint/no-unused-vars
  return prospects.map((p) => ({ ...p, tags: [] }))
}

export default async function ProspectsPage({
  searchParams,
}: {
  searchParams: Promise<ProspectsSearchParams>
}) {
  const params = await searchParams
  const status = parseStatus(params.status)
  const platform = parsePlatform(params.platform)
  const search = params.q ?? ""
  const assignedToMe = params.assigned === "me"
  const requestedPage = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1)

  const [allResult, tagsResult, orgResult, orgCtxResult, industriesResult, platformsResult, campaignsResult, savedViewsResult] = await Promise.all([
    getProspects({}),
    getUserTags(),
    getCurrentOrg(),
    getAuthedOrgClient(),
    getOrgIndustries(),
    getOrgCustomPlatforms(),
    getCampaignOptions(),
    getSavedViews(),
  ])

  const all = allResult.data ?? []
  const allTags = tagsResult.data ?? []
  const agencyReady = Boolean(orgResult.data?.agency_name)
  const currentUserId = orgCtxResult.ctx?.userId ?? ""
  const isAdmin = orgCtxResult.ctx?.role === "admin"
  const industryOptions = (industriesResult.data ?? []).map((i) => i.name)
  const customPlatforms = (platformsResult.data ?? []).map((p) => p.name)
  const campaignOptions = campaignsResult.data ?? []
  const stats = computeStats(all)
  const counts = computeCounts(all, currentUserId)

  const filtered = filterProspects(all, {
    status,
    platform,
    search,
    assignedToUserId: assignedToMe ? currentUserId : null,
  })
  const pageSize = 10
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(requestedPage, totalPages)
  const prospects = attachTags(filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize), allTags)

  const hasAnyProspects = all.length > 0

  return (
    <div className="w-full min-w-0 max-w-full space-y-6 overflow-hidden">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Prospects</h2>
          <p className="text-sm text-muted-foreground">
            Every contact in your outreach pipeline.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <ExportProspectsButton filters={{ status, platform, search, assignedToMe }} />
          <ImportProspectsDialog />
          <AddProspectDialog industryOptions={industryOptions} customPlatforms={customPlatforms} campaignOptions={campaignOptions} />
        </div>
      </div>

      <StatsRow {...stats} />

      <SavedViewsBar initialViews={savedViewsResult.data ?? []} filters={{ status: status ?? undefined, platform: platform ?? undefined, q: search || undefined, assigned: assignedToMe ? "me" : undefined }} />

      {hasAnyProspects ? (
        <>
          <FilterBar
            counts={counts}
            initialSearch={search}
            activeStatus={status}
            activePlatform={platform}
            activeAssignedToMe={assignedToMe}
          />

          <div className="w-full min-w-0 max-w-full overflow-hidden">
          <Suspense fallback={<ProspectListSkeleton />}>
            {prospects.length === 0 ? (
              <EmptyState
                title="No prospects match these filters"
                description="Try clearing the filters or widening your search."
                action={<ClearFiltersLink />}
              />
            ) : (
              <ProspectTable
                prospects={prospects}
                agencyReady={agencyReady}
                isAdmin={isAdmin}
              />
            )}
          </Suspense>
          </div>

          {prospects.length > 0 && (
            <ProspectPagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filtered.length}
              pageSize={pageSize}
              params={{ status: status ?? undefined, platform: platform ?? undefined, q: search || undefined, assigned: assignedToMe ? "me" : undefined }}
            />
          )}
        </>
      ) : (
        <EmptyState
          title="Add your first prospect"
          description="Capture the business name, platform, and a note. Generate personalized outreach in seconds."
          action={
            <AddProspectDialog
              industryOptions={industryOptions}
              customPlatforms={customPlatforms}
              campaignOptions={campaignOptions}
              triggerLabel="Add your first prospect"
            />
          }
        />
      )}
    </div>
  )
}
