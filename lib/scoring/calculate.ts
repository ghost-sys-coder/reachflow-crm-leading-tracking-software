import type { OrgContext } from "@/lib/auth/org"

type Rule = { id: string; name: string; field: string; operator: string; comparison_value: string | null; points: number }

function matches(actual: string | boolean | null | undefined, operator: string, expected: string | null) {
  if (operator === "exists") return Boolean(actual)
  const left = String(actual ?? "").toLowerCase()
  const right = String(expected ?? "").toLowerCase()
  if (operator === "equals") return left === right
  if (operator === "not_equals") return left !== right
  if (operator === "contains") return left.includes(right)
  return false
}

export async function recalculateProspectScore(ctx: OrgContext, prospectId: string) {
  const [{ data: prospect }, { data: model }, { data: attribution }] = await Promise.all([
    ctx.supabase.from("prospects").select("id,status,platform,country,industry,handle,phone_number").eq("id", prospectId).eq("org_id", ctx.orgId).maybeSingle(),
    ctx.supabase.from("lead_score_models").select("id,hot_threshold,warm_threshold,lead_score_rules(id,name,field,operator,comparison_value,points,is_active)").eq("org_id", ctx.orgId).eq("is_active", true).order("version", { ascending: false }).limit(1).maybeSingle(),
    ctx.supabase.from("prospect_attributions").select("source_name").eq("prospect_id", prospectId).eq("org_id", ctx.orgId).order("captured_at", { ascending: false }).limit(1).maybeSingle(),
  ])
  if (!prospect || !model) return null
  const values: Record<string, string | boolean | null> = { status: prospect.status, platform: prospect.platform, country: prospect.country, industry: prospect.industry, source: attribution?.source_name ?? null, has_email: prospect.platform === "email" || String(prospect.handle ?? "").includes("@"), has_phone: Boolean(prospect.phone_number) }
  const breakdown = ((model.lead_score_rules ?? []) as Rule[]).filter((rule: Rule & { is_active?: boolean }) => rule.is_active !== false && matches(values[rule.field], rule.operator, rule.comparison_value)).map(rule => ({ rule_id: rule.id, name: rule.name, points: rule.points, reason: `${rule.field} ${rule.operator}${rule.operator === "exists" ? "" : ` ${rule.comparison_value ?? ""}`}` }))
  const score = breakdown.reduce((sum, item) => sum + item.points, 0)
  const band = score >= model.hot_threshold ? "hot" : score >= model.warm_threshold ? "warm" : "cold"
  await ctx.supabase.from("prospect_scores").upsert({ prospect_id: prospectId, org_id: ctx.orgId, model_id: model.id, score, band, breakdown, calculated_at: new Date().toISOString() }, { onConflict: "prospect_id" })
  return { score, band, breakdown }
}

export async function recalculateOrganizationScores(ctx: OrgContext) {
  const { data } = await ctx.supabase.from("prospects").select("id").eq("org_id", ctx.orgId)
  await Promise.all((data ?? []).map(prospect => recalculateProspectScore(ctx, prospect.id)))
}
