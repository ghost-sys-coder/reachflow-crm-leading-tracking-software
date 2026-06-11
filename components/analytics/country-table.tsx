"use client"

import * as React from "react"
import { ArrowUpDown, ChevronDown, ChevronUp } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { COUNTRIES } from "@/lib/constants/countries"
import type { AnalyticsData, CountryStat } from "@/app/actions/analytics"

const flagMap = new Map(COUNTRIES.map((c) => [c.name, c.flag]))

type SortKey = "country" | "count" | "replied" | "booked" | "replyRate" | "bookingRate"
type SortDir = "asc" | "desc"

const COL_HEADERS: { key: SortKey; label: string }[] = [
  { key: "country",     label: "Country" },
  { key: "count",       label: "Prospects" },
  { key: "replied",     label: "Replied" },
  { key: "booked",      label: "Booked" },
  { key: "replyRate",   label: "Reply rate" },
  { key: "bookingRate", label: "Booking rate" },
]

function sortRows(rows: CountryStat[], key: SortKey, dir: SortDir): CountryStat[] {
  return [...rows].sort((a, b) => {
    const av = key === "country" ? a.country.toLowerCase() : (a[key] as number)
    const bv = key === "country" ? b.country.toLowerCase() : (b[key] as number)
    if (av < bv) return dir === "asc" ? -1 : 1
    if (av > bv) return dir === "asc" ? 1 : -1
    return 0
  })
}

export function CountryConversionTable({ data }: { data: AnalyticsData }) {
  const [sortKey, setSortKey] = React.useState<SortKey>("count")
  const [sortDir, setSortDir] = React.useState<SortDir>("desc")

  const rows = data.countryStats.filter((s) => s.count >= 2)
  const sorted = sortRows(rows, sortKey, sortDir)

  const maxReplyRate    = Math.max(...rows.map((r) => r.replyRate), 0.001)
  const maxBookingRate  = Math.max(...rows.map((r) => r.bookingRate), 0.001)
  const coverage = Math.round(data.countryCoverage * 100)

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir(key === "country" ? "asc" : "desc")
    }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (col !== sortKey) return <ArrowUpDown className="ml-1 inline size-3 text-muted-foreground/50" />
    return sortDir === "asc"
      ? <ChevronUp className="ml-1 inline size-3 text-primary" />
      : <ChevronDown className="ml-1 inline size-3 text-primary" />
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Country conversion</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {rows.length === 0 ? (
          <p className="px-6 py-6 text-center text-sm text-muted-foreground">
            {data.countryStats.length === 0
              ? "No country data yet. Add countries to prospects to see conversions."
              : "Not enough data — countries need at least 2 prospects to appear."}
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    {COL_HEADERS.map((col) => (
                      <th
                        key={col.key}
                        onClick={() => handleSort(col.key)}
                        className="cursor-pointer select-none px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
                      >
                        {col.label}
                        <SortIcon col={col.key} />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((s) => {
                    const flag          = flagMap.get(s.country) ?? "🌐"
                    const replyBarW     = Math.round((s.replyRate   / maxReplyRate)   * 100)
                    const bookingBarW   = Math.round((s.bookingRate / maxBookingRate) * 100)
                    return (
                      <tr key={s.country} className="border-b border-border last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-2.5">
                          <span className="mr-1.5">{flag}</span>
                          {s.country}
                        </td>
                        <td className="px-4 py-2.5 tabular-nums">{s.count}</td>
                        <td className="px-4 py-2.5 tabular-nums">{s.replied}</td>
                        <td className="px-4 py-2.5 tabular-nums">{s.booked}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                              <div className="h-full rounded-full bg-primary/60" style={{ width: `${replyBarW}%` }} />
                            </div>
                            <span className="tabular-nums text-xs">{Math.round(s.replyRate * 100)}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                              <div className="h-full rounded-full bg-primary/60" style={{ width: `${bookingBarW}%` }} />
                            </div>
                            <span className="tabular-nums text-xs">{Math.round(s.bookingRate * 100)}%</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <p className="px-4 py-2.5 text-xs text-muted-foreground">
              {rows.length} {rows.length === 1 ? "country" : "countries"} &middot; {coverage}% of prospects have a country set.
              {coverage < 80 && (
                <span className="ml-1 font-medium text-amber-600 dark:text-amber-400">
                  Fill in missing countries for better accuracy.
                </span>
              )}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}
