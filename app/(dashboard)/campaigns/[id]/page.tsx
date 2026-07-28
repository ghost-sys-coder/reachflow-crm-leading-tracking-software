import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, CalendarDays, CircleDollarSign, Megaphone, Target, UserRound } from "lucide-react"

import { getCampaignById, getCampaignOptions } from "@/app/actions/campaigns"
import { getOrgCustomPlatforms, getOrgIndustries } from "@/app/actions/custom-fields"
import { getProspects } from "@/app/actions/prospects"
import { getTeamMembers } from "@/app/actions/team"
import { getAuthedOrgClient } from "@/lib/auth/org"
import { CampaignDetailManager } from "@/components/campaigns/campaign-detail-manager"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

function formatMoney(cents: number | null, currency: string) {
  if (cents == null) return "No budget"
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(cents / 100)
}

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [campaignResult, prospectsResult, membersResult, orgResult, optionsResult, industriesResult, platformsResult] =
    await Promise.all([
      getCampaignById(id),
      getProspects({}),
      getTeamMembers(),
      getAuthedOrgClient(),
      getCampaignOptions(),
      getOrgIndustries(),
      getOrgCustomPlatforms(),
    ])

  if (!campaignResult.data) notFound()
  const campaign = campaignResult.data
  const members = membersResult.data ?? []
  const owner = members.find((member) => member.user_id === campaign.owner_id)
  const canWrite = orgResult.ctx?.role !== "viewer"
  const isAdmin = orgResult.ctx?.role === "admin"
  const bookingRate = campaign.prospect_count
    ? Math.round((campaign.booked_count / campaign.prospect_count) * 100)
    : 0

  return (
    <div className="space-y-6">
      <div>
        <Link href="/campaigns" className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" />Back to Campaigns
        </Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-semibold tracking-tight">{campaign.name}</h2>
              <Badge className="capitalize">{campaign.status}</Badge>
            </div>
            {campaign.description && <p className="max-w-2xl text-sm text-muted-foreground">{campaign.description}</p>}
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Prospects", campaign.prospect_count.toString()],
          ["Replied", campaign.replied_count.toString()],
          ["Booked", campaign.booked_count.toString()],
          ["Booking rate", `${bookingRate}%`],
        ].map(([label, value]) => (
          <Card key={label}><CardContent className="pt-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></CardContent></Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <CampaignDetailManager
          campaign={campaign}
          allProspects={prospectsResult.data ?? []}
          teamMembers={members}
          campaignOptions={optionsResult.data ?? []}
          industryOptions={(industriesResult.data ?? []).map((item) => item.name)}
          customPlatforms={(platformsResult.data ?? []).map((item) => item.name)}
          canWrite={canWrite}
          isAdmin={isAdmin}
        />

        <aside className="space-y-4 rounded-xl border p-4">
          <h3 className="font-medium">Campaign details</h3>
          <Separator />
          <dl className="space-y-4 text-sm">
            <div className="flex gap-3"><Megaphone className="mt-0.5 size-4 text-muted-foreground" /><div><dt className="text-xs text-muted-foreground">Channel</dt><dd>{campaign.channel ?? "Not set"}</dd></div></div>
            <div className="flex gap-3"><Target className="mt-0.5 size-4 text-muted-foreground" /><div><dt className="text-xs text-muted-foreground">Goal</dt><dd>{campaign.goal ?? "Not set"}</dd></div></div>
            <div className="flex gap-3"><CircleDollarSign className="mt-0.5 size-4 text-muted-foreground" /><div><dt className="text-xs text-muted-foreground">Budget</dt><dd>{formatMoney(campaign.budget_cents, campaign.currency)}</dd></div></div>
            <div className="flex gap-3"><UserRound className="mt-0.5 size-4 text-muted-foreground" /><div><dt className="text-xs text-muted-foreground">Owner</dt><dd>{owner?.full_name ?? owner?.email ?? "Unassigned"}</dd></div></div>
            <div className="flex gap-3"><CalendarDays className="mt-0.5 size-4 text-muted-foreground" /><div><dt className="text-xs text-muted-foreground">Schedule</dt><dd>{campaign.start_at ? new Date(campaign.start_at).toLocaleDateString() : "No start"} – {campaign.end_at ? new Date(campaign.end_at).toLocaleDateString() : "No end"}</dd></div></div>
          </dl>
        </aside>
      </div>
    </div>
  )
}
