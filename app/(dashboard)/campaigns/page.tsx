import Link from "next/link"
import { CalendarDays, Megaphone, Target, Users } from "lucide-react"

import { getCampaigns } from "@/app/actions/campaigns"
import { getTeamMembers } from "@/app/actions/team"
import { getAuthedOrgClient } from "@/lib/auth/org"
import { CampaignDialog } from "@/components/campaigns/campaign-dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const STATUS_CLASS: Record<string, string> = {
  draft: "bg-zinc-500/10 text-zinc-600",
  active: "bg-emerald-500/10 text-emerald-600",
  paused: "bg-amber-500/10 text-amber-700",
  completed: "bg-blue-500/10 text-blue-600",
  archived: "bg-muted text-muted-foreground",
}

export default async function CampaignsPage() {
  const [campaignsResult, membersResult, orgResult] = await Promise.all([
    getCampaigns(),
    getTeamMembers(),
    getAuthedOrgClient(),
  ])
  const campaigns = campaignsResult.data ?? []
  const members = membersResult.data ?? []
  const canWrite = orgResult.ctx?.role !== "viewer"

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Campaigns</h2>
          <p className="text-sm text-muted-foreground">
            Organize prospects around initiatives and track pipeline outcomes.
          </p>
        </div>
        {canWrite && <CampaignDialog teamMembers={members} />}
      </div>

      {campaigns.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <Megaphone className="mx-auto mb-3 size-8 text-muted-foreground" />
          <h3 className="font-medium">No campaigns yet</h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Create a campaign to group prospects by initiative, owner, channel, and goal.
          </p>
          {canWrite && (
            <div className="mt-4">
              <CampaignDialog teamMembers={members} />
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {campaigns.map((campaign) => {
            const conversion =
              campaign.prospect_count === 0
                ? 0
                : Math.round((campaign.booked_count / campaign.prospect_count) * 100)
            return (
              <Link key={campaign.id} href={`/campaigns/${campaign.id}`} className="group">
                <Card className="h-full transition-colors group-hover:border-primary/40">
                  <CardHeader className="gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <CardTitle className="line-clamp-2">{campaign.name}</CardTitle>
                      <Badge className={STATUS_CLASS[campaign.status] ?? ""}>
                        {campaign.status}
                      </Badge>
                    </div>
                    {campaign.description && (
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {campaign.description}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="size-4" />
                      <span>{campaign.prospect_count} prospects</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Target className="size-4" />
                      <span>{conversion}% booked</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Megaphone className="size-4" />
                      <span className="truncate">{campaign.channel ?? "No channel"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <CalendarDays className="size-4" />
                      <span>{campaign.start_at ? new Date(campaign.start_at).toLocaleDateString() : "Unscheduled"}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
