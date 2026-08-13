import { DatabaseZap, ShieldCheck, UsersRound } from "lucide-react"
import { getAuthedOrgClient } from "@/lib/auth/org"
import { scanDuplicates, updateRetention } from "@/app/actions/data-controls"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default async function DataControlsPage() {
  const { ctx } = await getAuthedOrgClient(); if (!ctx) return null
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
  const [prospects, members, imports, generations, policy, duplicates, suppressed] = await Promise.all([
    ctx.supabase.from("prospects").select("*", { count: "exact", head: true }).eq("org_id", ctx.orgId),
    ctx.supabase.from("organization_members").select("*", { count: "exact", head: true }).eq("org_id", ctx.orgId),
    ctx.supabase.from("import_batches").select("*", { count: "exact", head: true }).eq("org_id", ctx.orgId).gte("created_at", monthStart),
    ctx.supabase.from("generation_logs").select("*", { count: "exact", head: true }).eq("org_id", ctx.orgId).gte("created_at", monthStart),
    ctx.supabase.from("retention_policies").select("*").eq("org_id", ctx.orgId).maybeSingle(),
    ctx.supabase.from("duplicate_candidates").select("*,prospect_a:prospects!duplicate_candidates_prospect_a_id_fkey(business_name),prospect_b:prospects!duplicate_candidates_prospect_b_id_fkey(business_name)").eq("org_id", ctx.orgId).eq("status", "pending"),
    ctx.supabase.from("suppression_entries").select("*", { count: "exact", head: true }).eq("org_id", ctx.orgId).is("revoked_at", null),
  ])
  const metrics = [["Prospects", prospects.count, 500], ["Team members", members.count, 3], ["Imports this month", imports.count, 10], ["AI generations this month", generations.count, 100]] as const
  return <div className="space-y-6"><div><h1 className="text-2xl font-semibold">Data controls</h1><p className="text-muted-foreground">Usage visibility, durable suppression, retention policy, and duplicate review.</p></div><div className="grid gap-3 md:grid-cols-4">{metrics.map(([label,value,limit])=><Card key={label}><CardContent className="pt-1"><p className="text-xs text-muted-foreground">{label}</p><p className="text-xl font-semibold">{value??0} <span className="text-sm font-normal text-muted-foreground">/ {limit}</span></p><div className="mt-2 h-1.5 overflow-hidden rounded bg-muted"><div className="h-full bg-primary" style={{width:`${Math.min(100,((value??0)/limit)*100)}%`}}/></div></CardContent></Card>)}</div><div className="grid gap-4 lg:grid-cols-2"><Card><CardHeader><CardTitle><ShieldCheck className="mr-2 inline size-4"/>Compliance & retention</CardTitle></CardHeader><CardContent className="space-y-4"><p className="text-sm text-muted-foreground">{suppressed.count??0} active do-not-contact identities.</p>{ctx.role==="admin"&&<form action={updateRetention} className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Prospect retention days<Input name="prospect_days" type="number" min="30" defaultValue={policy.data?.prospect_retention_days??730}/></label><label className="text-sm">Message retention days<Input name="message_days" type="number" min="30" defaultValue={policy.data?.message_retention_days??730}/></label><label className="flex items-center gap-2 text-sm"><input name="legal_hold" type="checkbox" defaultChecked={policy.data?.legal_hold}/>Legal hold</label><Button className="sm:col-span-2">Save retention policy</Button></form>}</CardContent></Card><Card><CardHeader><CardTitle><UsersRound className="mr-2 inline size-4"/>Duplicate review</CardTitle></CardHeader><CardContent className="space-y-3"><form action={scanDuplicates}><Button variant="outline"><DatabaseZap/>Scan prospects</Button></form>{duplicates.data?.map(d=><div key={d.id} className="rounded-lg border p-3"><div className="flex justify-between"><b>{d.prospect_a?.business_name} ↔ {d.prospect_b?.business_name}</b><span className="text-sm font-semibold text-amber-600">{d.confidence}%</span></div><p className="text-xs text-muted-foreground">Matched on: {d.matched_on.join(", ")}. Merge remains guarded pending relationship preview.</p></div>)}{!duplicates.data?.length&&<p className="text-sm text-muted-foreground">No pending duplicate candidates.</p>}</CardContent></Card></div></div>
}
