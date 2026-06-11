import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { COUNTRIES } from "@/lib/constants/countries"
import type { AnalyticsData } from "@/app/actions/analytics"

const flagMap = new Map(COUNTRIES.map((c) => [c.name, c.flag]))

export function CountryChart({ data }: { data: AnalyticsData }) {
  const top = data.countryStats.slice(0, 10)
  const maxCount = Math.max(...top.map((s) => s.count), 1)
  const coverage = Math.round(data.countryCoverage * 100)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top countries</CardTitle>
      </CardHeader>
      <CardContent>
        {top.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            <p>No country data yet.</p>
            <p className="mt-1 text-xs">Add countries to your prospects to see geographic reach.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {top.map((s) => {
              const bar  = Math.round((s.count / maxCount) * 100)
              const rate = Math.round(s.replyRate * 100)
              const flag = flagMap.get(s.country) ?? "🌐"
              return (
                <div key={s.country} className="flex items-center gap-3 text-sm">
                  <span className="w-32 shrink-0 truncate text-right text-xs text-muted-foreground">
                    {flag} {s.country}
                  </span>
                  <div className="flex-1 overflow-hidden rounded-sm bg-muted" style={{ height: "18px" }}>
                    <div
                      className="h-full rounded-sm bg-primary/70 transition-all"
                      style={{ width: `${bar}%` }}
                    />
                  </div>
                  <span className="w-24 shrink-0 text-xs text-muted-foreground">
                    {s.count}{" "}
                    <span className="text-primary">&middot; {rate}% reply</span>
                  </span>
                </div>
              )
            })}

            {data.countryStats.length > 10 && (
              <p className="pt-1 text-xs text-muted-foreground">
                +{data.countryStats.length - 10} more countries in the table below.
              </p>
            )}

            <p className="pt-2 text-xs text-muted-foreground">
              {coverage}% of prospects have a country set.
              {coverage < 80 && (
                <span className="ml-1 font-medium text-amber-600 dark:text-amber-400">
                  Fill in missing countries for better accuracy.
                </span>
              )}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
