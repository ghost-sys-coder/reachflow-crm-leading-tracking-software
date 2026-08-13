import type { OrgContext } from "@/lib/auth/org"

export async function canContactProspect(ctx: OrgContext, prospectId: string) {
  const { data: prospect } = await ctx.supabase.from("prospects").select("handle,phone_number,platform").eq("id", prospectId).eq("org_id", ctx.orgId).maybeSingle()
  if (!prospect) return { allowed: false, reason: "Prospect not found" }
  const identities = [
    prospect.phone_number ? { type: "phone", value: prospect.phone_number.trim().toLowerCase() } : null,
    prospect.handle ? { type: prospect.platform === "email" ? "email" : "handle", value: prospect.handle.trim().toLowerCase() } : null,
  ].filter(Boolean) as Array<{type:string;value:string}>
  for (const identity of identities) {
    const { data } = await ctx.supabase.from("suppression_entries").select("reason").eq("org_id",ctx.orgId).eq("identity_type",identity.type).eq("identity_value",identity.value).is("revoked_at",null).maybeSingle()
    if (data) return { allowed:false, reason:`Do not contact: ${data.reason}` }
  }
  return { allowed:true, reason:null }
}
