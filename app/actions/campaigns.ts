"use server"

import { revalidatePath } from "next/cache"

import { getAuthedOrgClient } from "@/lib/auth/org"
import type { OrgContext } from "@/lib/auth/org"
import { fail, ok, zodErrorMessage } from "@/lib/validation/result"
import {
  campaignMembershipSchema,
  campaignSchema,
  campaignUpdateSchema,
  type CampaignInput,
  type CampaignUpdateInput,
} from "@/lib/validation/schemas"
import type {
  ActionResult,
  Campaign,
  CampaignWithMetrics,
  CampaignWithProspects,
  Prospect,
} from "@/types/database"

type CampaignJoin = Campaign & {
  campaign_prospects?: Array<{ prospect: Pick<Prospect, "status"> | null }>
}

function withMetrics(row: CampaignJoin): CampaignWithMetrics {
  const prospects = (row.campaign_prospects ?? [])
    .map((item) => item.prospect)
    .filter(Boolean) as Array<Pick<Prospect, "status">>

  const { campaign_prospects: _memberships, ...campaign } = row
  void _memberships
  return {
    ...campaign,
    prospect_count: prospects.length,
    replied_count: prospects.filter((p) => p.status === "replied").length,
    booked_count: prospects.filter((p) => p.status === "booked").length,
    closed_count: prospects.filter((p) => p.status === "closed").length,
  }
}

function campaignPayload(input: CampaignInput | CampaignUpdateInput) {
  return {
    ...input,
    start_at: input.start_at ? input.start_at.toISOString() : input.start_at,
    end_at: input.end_at ? input.end_at.toISOString() : input.end_at,
    updated_at: new Date().toISOString(),
  }
}

function revalidateCampaigns(id?: string) {
  revalidatePath("/campaigns")
  if (id) revalidatePath(`/campaigns/${id}`)
  revalidatePath("/pipeline")
  revalidatePath("/prospects", "layout")
}

async function ownerBelongsToOrg(
  ownerId: string | null | undefined,
  orgId: string,
  supabase: OrgContext["supabase"],
) {
  if (!ownerId) return true
  const { data } = await supabase
    .from("organization_members")
    .select("id")
    .eq("org_id", orgId)
    .eq("user_id", ownerId)
    .maybeSingle()
  return Boolean(data)
}

export async function getCampaignOptions(): Promise<
  ActionResult<Array<Pick<Campaign, "id" | "name" | "status">>>
> {
  const { ctx, error } = await getAuthedOrgClient()
  if (!ctx) return fail(error)

  const { data, error: dbError } = await ctx.supabase
    .from("campaigns")
    .select("id, name, status")
    .eq("org_id", ctx.orgId)
    .neq("status", "archived")
    .order("name")

  if (dbError) return fail(dbError.message)
  return ok((data ?? []) as Array<Pick<Campaign, "id" | "name" | "status">>)
}

export async function getCampaigns(): Promise<ActionResult<CampaignWithMetrics[]>> {
  const { ctx, error } = await getAuthedOrgClient()
  if (!ctx) return fail(error)

  const { data, error: dbError } = await ctx.supabase
    .from("campaigns")
    .select("*, campaign_prospects(prospect:prospects(status))")
    .eq("org_id", ctx.orgId)
    .order("created_at", { ascending: false })

  if (dbError) return fail(dbError.message)
  return ok(((data ?? []) as CampaignJoin[]).map(withMetrics))
}

export async function getCampaignById(
  id: string,
): Promise<ActionResult<CampaignWithProspects | null>> {
  const { ctx, error } = await getAuthedOrgClient()
  if (!ctx) return fail(error)

  const { data, error: dbError } = await ctx.supabase
    .from("campaigns")
    .select("*, campaign_prospects(prospect:prospects(*))")
    .eq("id", id)
    .eq("org_id", ctx.orgId)
    .maybeSingle()

  if (dbError) return fail(dbError.message)
  if (!data) return ok(null)

  const row = data as Campaign & {
    campaign_prospects?: Array<{ prospect: Prospect | null }>
  }
  const prospects = (row.campaign_prospects ?? [])
    .map((item) => item.prospect)
    .filter(Boolean) as Prospect[]
  const metrics = withMetrics({
    ...row,
    campaign_prospects: prospects.map((prospect) => ({ prospect })),
  })

  return ok({ ...metrics, prospects })
}

export async function createCampaign(
  input: CampaignInput,
): Promise<ActionResult<Campaign>> {
  const parsed = campaignSchema.safeParse(input)
  if (!parsed.success) return fail(zodErrorMessage(parsed.error))

  const { ctx, error } = await getAuthedOrgClient()
  if (!ctx) return fail(error)
  if (ctx.role === "viewer") return fail("Insufficient permissions")
  if (!(await ownerBelongsToOrg(parsed.data.owner_id, ctx.orgId, ctx.supabase))) {
    return fail("Campaign owner must be a member of this organization")
  }

  const { updated_at: _updatedAt, ...payload } = campaignPayload(parsed.data)
  void _updatedAt
  const { data, error: dbError } = await ctx.supabase
    .from("campaigns")
    .insert({
      ...payload,
      org_id: ctx.orgId,
      created_by: ctx.userId,
    })
    .select()
    .single()

  if (dbError) return fail(dbError.message)
  revalidateCampaigns((data as Campaign).id)
  return ok(data as Campaign)
}

export async function updateCampaign(
  id: string,
  input: CampaignUpdateInput,
): Promise<ActionResult<Campaign>> {
  const parsed = campaignUpdateSchema.safeParse(input)
  if (!parsed.success) return fail(zodErrorMessage(parsed.error))

  const { ctx, error } = await getAuthedOrgClient()
  if (!ctx) return fail(error)
  if (ctx.role === "viewer") return fail("Insufficient permissions")
  if (!(await ownerBelongsToOrg(parsed.data.owner_id, ctx.orgId, ctx.supabase))) {
    return fail("Campaign owner must be a member of this organization")
  }

  const { data, error: dbError } = await ctx.supabase
    .from("campaigns")
    .update(campaignPayload(parsed.data))
    .eq("id", id)
    .eq("org_id", ctx.orgId)
    .select()
    .single()

  if (dbError) return fail(dbError.message)
  revalidateCampaigns(id)
  return ok(data as Campaign)
}

export async function deleteCampaign(id: string): Promise<ActionResult<{ id: string }>> {
  const { ctx, error } = await getAuthedOrgClient()
  if (!ctx) return fail(error)
  if (ctx.role !== "admin") return fail("Only admins can delete campaigns")

  const { error: dbError } = await ctx.supabase
    .from("campaigns")
    .delete()
    .eq("id", id)
    .eq("org_id", ctx.orgId)

  if (dbError) return fail(dbError.message)
  revalidateCampaigns(id)
  return ok({ id })
}

export async function addProspectsToCampaign(
  campaignId: string,
  prospectIds: string[],
): Promise<ActionResult<{ count: number }>> {
  const parsed = campaignMembershipSchema.safeParse({ prospect_ids: prospectIds })
  if (!parsed.success) return fail(zodErrorMessage(parsed.error))

  const { ctx, error } = await getAuthedOrgClient()
  if (!ctx) return fail(error)
  if (ctx.role === "viewer") return fail("Insufficient permissions")

  const [{ data: campaign }, { data: prospects }] = await Promise.all([
    ctx.supabase.from("campaigns").select("id").eq("id", campaignId).eq("org_id", ctx.orgId).maybeSingle(),
    ctx.supabase.from("prospects").select("id").in("id", parsed.data.prospect_ids).eq("org_id", ctx.orgId),
  ])
  if (!campaign) return fail("Campaign not found")
  if ((prospects ?? []).length !== new Set(parsed.data.prospect_ids).size) {
    return fail("One or more prospects are not available in this organization")
  }

  const { error: dbError } = await ctx.supabase.from("campaign_prospects").upsert(
    parsed.data.prospect_ids.map((prospectId) => ({
      campaign_id: campaignId,
      prospect_id: prospectId,
      added_by: ctx.userId,
    })),
    { onConflict: "campaign_id,prospect_id", ignoreDuplicates: true },
  )

  if (dbError) return fail(dbError.message)
  revalidateCampaigns(campaignId)
  return ok({ count: parsed.data.prospect_ids.length })
}

export async function removeProspectFromCampaign(
  campaignId: string,
  prospectId: string,
): Promise<ActionResult<{ done: true }>> {
  const { ctx, error } = await getAuthedOrgClient()
  if (!ctx) return fail(error)
  if (ctx.role === "viewer") return fail("Insufficient permissions")

  const { data: campaign } = await ctx.supabase
    .from("campaigns")
    .select("id")
    .eq("id", campaignId)
    .eq("org_id", ctx.orgId)
    .maybeSingle()
  if (!campaign) return fail("Campaign not found")

  const { error: dbError } = await ctx.supabase
    .from("campaign_prospects")
    .delete()
    .eq("campaign_id", campaignId)
    .eq("prospect_id", prospectId)

  if (dbError) return fail(dbError.message)
  revalidateCampaigns(campaignId)
  return ok({ done: true })
}
