import { KpiCards } from "@/components/analytics/kpi-cards"
import { PeriodPicker } from "@/components/analytics/period-picker"
import { PlatformChart } from "@/components/analytics/platform-chart"
import { StatusFunnel } from "@/components/analytics/status-funnel"
import { TeamTable } from "@/components/analytics/team-table"
import { WeeklyChart } from "@/components/analytics/weekly-chart"
import { getAnalytics, type PeriodKey } from "@/app/actions/analytics"

type SearchParams = { period?: string }

function parsePeriod(p: string | undefined): PeriodKey {
  if (p === "90d" || p === "all") return p
  return "30d"
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const period = parsePeriod(params.period)
  const result = await getAnalytics(period)

  if (result.error) {
    return (
      <div className="py-20 text-center text-sm text-muted-foreground">
        Could not load analytics: {result.error}
      </div>
    )
  }

  const data = result.data!

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Analytics</h2>
          <p className="text-sm text-muted-foreground">
            Track outreach performance and team activity.
          </p>
        </div>
        <PeriodPicker current={period} />
      </div>

      <KpiCards data={data} />

      <div className="grid gap-6 lg:grid-cols-2">
        <StatusFunnel data={data} />
        <PlatformChart data={data} />
      </div>

      <WeeklyChart data={data} />

      <TeamTable data={data} />
    </div>
  )
}
