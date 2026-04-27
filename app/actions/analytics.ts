"use server"

import { getAuthedOrgClient } from "@/lib/auth/org"
import { fail, ok } from "@/lib/validation/result"
import { PLATFORMS, PROSPECT_STATUSES } from "@/lib/validation/schemas"
import type { ActionResult, Prospect, TeamMember } from "@/types/database"
import type { Platform, ProspectStatus } from "@/db/schema"

export type PeriodKey = "30d" | "90d" | "all"

export type PlatformStat = {
  platform: Platform
  count: number
  replied: number
  replyRate: number
}

export type WeekActivity = {
  label: string
  count: number
}

export type TeamStat = {
  userId: string
  name: string
  email: string
  assigned: number
  booked: number
  bookingRate: number
}

export type AnalyticsData = {
  period: PeriodKey
  total: number
  replyRate: number
  bookingRate: number
  newThisWeek: number
  statusCounts: Record<ProspectStatus, number>
  platformStats: PlatformStat[]
  weeklyActivity: WeekActivity[]
  teamStats: TeamStat[]
}

function getWeekStart(date: Date): Date {
  const d = new Date(date)
  d.setUTCHours(0, 0, 0, 0)
  const day = d.getUTCDay()
  d.setUTCDate(d.getUTCDate() + (day === 0 ? -6 : 1 - day))
  return d
}

export async function getAnalytics(period: PeriodKey = "30d"): Promise<ActionResult<AnalyticsData>> {
  const { ctx, error } = await getAuthedOrgClient()
  if (!ctx) return fail(error)

  const { data: raw, error: dbError } = await ctx.supabase
    .from("prospects")
    .select("*")
    .eq("org_id", ctx.orgId)
    .order("created_at", { ascending: false })

  if (dbError) return fail(dbError.message)

  const all = (raw ?? []) as Prospect[]

  const now = Date.now()
  const cutoff =
    period === "30d" ? now - 30 * 86_400_000
    : period === "90d" ? now - 90 * 86_400_000
    : 0

  const filtered = cutoff > 0
    ? all.filter((p) => new Date(p.created_at).getTime() >= cutoff)
    : all

  // KPIs
  const total = filtered.length
  const repliedCount = filtered.filter((p) => p.status === "replied" || p.status === "booked").length
  const bookedCount  = filtered.filter((p) => p.status === "booked").length
  const newThisWeek  = filtered.filter((p) => new Date(p.created_at).getTime() >= now - 7 * 86_400_000).length

  // Status counts
  const statusCounts = Object.fromEntries(
    PROSPECT_STATUSES.map((s) => [s, 0]),
  ) as Record<ProspectStatus, number>
  for (const p of filtered) {
    if (p.status in statusCounts) statusCounts[p.status as ProspectStatus]++
  }

  // Platform stats
  const platMap = new Map<Platform, { count: number; replied: number }>(
    PLATFORMS.map((pl) => [pl, { count: 0, replied: 0 }]),
  )
  for (const p of filtered) {
    const entry = platMap.get(p.platform as Platform)
    if (!entry) continue
    entry.count++
    if (p.status === "replied" || p.status === "booked") entry.replied++
  }
  const platformStats: PlatformStat[] = PLATFORMS
    .map((platform) => {
      const e = platMap.get(platform)!
      return { platform, count: e.count, replied: e.replied, replyRate: e.count === 0 ? 0 : e.replied / e.count }
    })
    .filter((s) => s.count > 0)
    .sort((a, b) => b.count - a.count)

  // Weekly activity — always last 12 weeks regardless of period
  const weeklyActivity: WeekActivity[] = []
  for (let i = 11; i >= 0; i--) {
    const weekStart = getWeekStart(new Date(now - i * 7 * 86_400_000))
    const weekEnd   = new Date(weekStart.getTime() + 7 * 86_400_000)
    const count = all.filter((p) => {
      const t = new Date(p.created_at).getTime()
      return t >= weekStart.getTime() && t < weekEnd.getTime()
    }).length
    weeklyActivity.push({
      label: weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
      count,
    })
  }

  // Team performance
  const { data: membersRaw } = await ctx.supabase
    .rpc("get_org_members_with_profiles", { p_org_id: ctx.orgId })

  const members = (membersRaw ?? []) as TeamMember[]
  const teamStats: TeamStat[] = members
    .map((m) => {
      const memberProspects = filtered.filter((p) => p.assigned_to === m.user_id)
      const assigned = memberProspects.length
      const booked   = memberProspects.filter((p) => p.status === "booked").length
      return {
        userId: m.user_id,
        name: m.full_name ?? m.email,
        email: m.email,
        assigned,
        booked,
        bookingRate: assigned === 0 ? 0 : booked / assigned,
      }
    })
    .sort((a, b) => b.assigned - a.assigned)

  return ok({
    period,
    total,
    replyRate:   total === 0 ? 0 : repliedCount / total,
    bookingRate: total === 0 ? 0 : bookedCount  / total,
    newThisWeek,
    statusCounts,
    platformStats,
    weeklyActivity,
    teamStats,
  })
}
