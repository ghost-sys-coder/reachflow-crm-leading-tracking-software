"use server"

import { revalidatePath } from "next/cache"
import { getAuthedOrgClient } from "@/lib/auth/org"
import { recalculateOrganizationScores, recalculateProspectScore } from "@/lib/scoring/calculate"

export async function createDeal(formData: FormData): Promise<void> {
  const { ctx, error } = await getAuthedOrgClient()
  if (!ctx || ctx.role === "viewer") return
  const prospectId = String(formData.get("prospect_id") ?? "")
  const stageId = String(formData.get("stage_id") ?? "")
  const name = String(formData.get("name") ?? "").trim()
  const currency = String(formData.get("currency") ?? "USD").trim().toUpperCase()
  const value = Number(formData.get("value") ?? 0)
  if (!prospectId || !stageId || !name || !Number.isFinite(value) || value < 0 || !/^[A-Z]{3}$/.test(currency)) return
  const { data: stage } = await ctx.supabase.from("deal_stages").select("probability").eq("id", stageId).eq("org_id", ctx.orgId).single()
  const { error: insertError } = await ctx.supabase.from("deals").insert({ org_id: ctx.orgId, prospect_id: prospectId, stage_id: stageId, owner_id: ctx.userId, created_by: ctx.userId, name, service: String(formData.get("service") ?? "") || null, value_cents: Math.round(value * 100), currency, probability: stage?.probability ?? 0, expected_close_at: String(formData.get("expected_close_at") ?? "") || null })
  if (insertError) return
  revalidatePath("/deals"); revalidatePath(`/prospects/${prospectId}`)
}

export async function moveDeal(formData: FormData): Promise<void> {
  const { ctx, error } = await getAuthedOrgClient()
  if (!ctx || ctx.role === "viewer") return
  const id = String(formData.get("id")); const stageId = String(formData.get("stage_id")); const reason = String(formData.get("lost_reason") ?? "").trim()
  const [{ data: deal }, { data: stage }] = await Promise.all([ctx.supabase.from("deals").select("stage_id").eq("id",id).eq("org_id",ctx.orgId).single(),ctx.supabase.from("deal_stages").select("probability,is_closed,is_won").eq("id",stageId).eq("org_id",ctx.orgId).single()])
  if (!deal || !stage) return
  if (stage.is_closed && !stage.is_won && !reason) return
  const now = new Date().toISOString()
  const { error: updateError } = await ctx.supabase.from("deals").update({ stage_id: stageId, probability: stage.probability, won_at: stage.is_won ? now : null, lost_at: stage.is_closed && !stage.is_won ? now : null, lost_reason: stage.is_closed && !stage.is_won ? reason : null, updated_at: now }).eq("id",id).eq("org_id",ctx.orgId)
  if (!updateError) await ctx.supabase.from("deal_stage_history").insert({ org_id:ctx.orgId,deal_id:id,from_stage_id:deal.stage_id,to_stage_id:stageId,changed_by:ctx.userId,note:reason||null })
  revalidatePath("/deals")
}

export async function addAttribution(formData: FormData): Promise<void> {
  const { ctx } = await getAuthedOrgClient(); if (!ctx || ctx.role === "viewer") return
  const prospectId=String(formData.get("prospect_id")); const sourceName=String(formData.get("source_name")??"").trim(); if(!sourceName)return
  const { error: e }=await ctx.supabase.from("prospect_attributions").insert({org_id:ctx.orgId,prospect_id:prospectId,provider:String(formData.get("provider")??"manual"),source_name:sourceName,campaign_name:String(formData.get("campaign_name")??"")||null,utm_source:String(formData.get("utm_source")??"")||null,utm_medium:String(formData.get("utm_medium")??"")||null,utm_campaign:String(formData.get("utm_campaign")??"")||null,landing_page:String(formData.get("landing_page")??"")||null,created_by:ctx.userId})
  if(!e) { await recalculateProspectScore(ctx, prospectId); revalidatePath(`/prospects/${prospectId}`); revalidatePath("/prospects") }
}

export async function recalculateScore(formData: FormData): Promise<void> {
  const {ctx}=await getAuthedOrgClient(); if(!ctx||ctx.role==="viewer")return
  const prospectId=String(formData.get("prospect_id")??""); if(!prospectId)return
  await recalculateProspectScore(ctx,prospectId); revalidatePath(`/prospects/${prospectId}`); revalidatePath("/prospects")
}

export async function createScoringRule(formData: FormData): Promise<void> {
  const {ctx}=await getAuthedOrgClient(); if(!ctx||ctx.role!=="admin")return
  let {data:model}=await ctx.supabase.from("lead_score_models").select("id").eq("org_id",ctx.orgId).eq("is_active",true).maybeSingle()
  if(!model){const result=await ctx.supabase.from("lead_score_models").insert({org_id:ctx.orgId,created_by:ctx.userId}).select("id").single();model=result.data}
  if(!model)return
  const points=Number(formData.get("points")); const {error:e}=await ctx.supabase.from("lead_score_rules").insert({org_id:ctx.orgId,model_id:model.id,name:String(formData.get("name")),field:String(formData.get("field")),operator:String(formData.get("operator")),comparison_value:String(formData.get("comparison_value")??"")||null,points})
  if(!e) { await recalculateOrganizationScores(ctx); revalidatePath("/scoring"); revalidatePath("/prospects", "layout") }
}
