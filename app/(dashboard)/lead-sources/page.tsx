import { DatabaseZap } from "lucide-react"
import { getAuthedOrgClient } from "@/lib/auth/org"
import { LeadSourceManager } from "@/components/lead-sources/lead-source-manager"

export default async function LeadSourcesPage() {
  const { ctx } = await getAuthedOrgClient()
  if (!ctx) return null
  if (ctx.role !== "admin") return <div className="rounded-xl border p-8"><h1 className="text-xl font-semibold">Administrator access required</h1><p className="mt-2 text-sm text-muted-foreground">Inbound source credentials and raw event payloads are restricted to workspace administrators.</p></div>
  const [{ data: sources }, { data: events }, { data: campaigns }, { data: tags }, { data: members }] = await Promise.all([
    ctx.supabase.from("lead_sources").select("id,name,is_active,secret_last_four,failure_count,last_received_at,last_success_at,last_failure_at,created_at").eq("org_id", ctx.orgId).eq("source_type", "inbound_webhook").order("created_at", { ascending: false }),
    ctx.supabase.from("ingestion_events").select("id,external_event_id,status,outcome,error_message,prospect_id,received_at,attempt_count,lead_sources(name)").eq("org_id", ctx.orgId).order("received_at", { ascending: false }).limit(100),
    ctx.supabase.from("campaigns").select("id,name").eq("org_id", ctx.orgId).order("name"),
    ctx.supabase.from("tags").select("id,name").eq("org_id", ctx.orgId).order("name"),
    ctx.supabase.from("organization_members").select("user_id,profiles(full_name)").eq("org_id", ctx.orgId),
  ])
  return <div className="space-y-6"><header><h1 className="flex items-center gap-2 text-2xl font-semibold"><DatabaseZap />Lead sources</h1><p className="mt-1 text-sm text-muted-foreground">Accept signed lead payloads, map fields, prevent duplicates, route prospects, and inspect every processing outcome.</p></header><LeadSourceManager sources={sources ?? []} events={events ?? []} campaigns={campaigns ?? []} tags={tags ?? []} members={members ?? []} appUrl={process.env.NEXT_PUBLIC_APP_URL ?? ""} /></div>
}
