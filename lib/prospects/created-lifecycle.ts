import type { OrgContext } from "@/lib/auth/org"
import { logActivity } from "@/lib/activity/log"
import { runAutomations } from "@/lib/automation/engine"
import { recalculateProspectScore } from "@/lib/scoring/calculate"
import { publishWebhookEvent } from "@/lib/webhooks/publish"

type CreatedProspect = {
  id: string
  business_name: string
  platform: string
  status: string
  industry: string | null
  location: string | null
  state: string | null
  country: string | null
}

export async function runProspectCreatedLifecycle(ctx: OrgContext, prospect: CreatedProspect) {
  const { data: existingActivity } = await ctx.supabase.from("activity_log").select("id").eq("org_id", ctx.orgId).eq("prospect_id", prospect.id).eq("action", "prospect_created").limit(1).maybeSingle()
  if (!existingActivity) void logActivity({ orgId: ctx.orgId, prospectId: prospect.id, userId: ctx.userId, action: "prospect_created", newValue: prospect.business_name })
  await recalculateProspectScore(ctx, prospect.id)
  await runAutomations(ctx, "prospect_created", prospect.id, `prospect_created:${prospect.id}`)
  await publishWebhookEvent(ctx, "prospect.created", prospect.id, { prospect: { id: prospect.id, business_name: prospect.business_name, platform: prospect.platform, status: prospect.status, industry: prospect.industry, location: prospect.location, state: prospect.state, country: prospect.country } }, `prospect.created:${prospect.id}`)
}
