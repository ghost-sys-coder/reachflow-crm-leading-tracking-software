import { FileInput } from "lucide-react";
import { getAuthedOrgClient } from "@/lib/auth/org";
import { HostedFormManager } from "@/components/forms/hosted-form-manager";

export default async function FormsPage() {
  const { ctx } = await getAuthedOrgClient();
  if (!ctx) return null;
  if (ctx.role !== "admin") return <div className="rounded-xl border p-8"><h1 className="text-xl font-semibold">Administrator access required</h1><p className="mt-2 text-sm text-muted-foreground">Form configuration and consent evidence are restricted to workspace administrators.</p></div>;
  const [{ data: forms }, { data: submissions }] = await Promise.all([
    ctx.supabase.from("hosted_forms").select("id,name,slug,status,title,created_at,source_id").eq("org_id", ctx.orgId).order("created_at", { ascending: false }),
    ctx.supabase.from("form_submissions").select("id,form_id,submitted_at,consent_given,ingestion_events(id,status,outcome,error_message,prospect_id)").eq("org_id", ctx.orgId).order("submitted_at", { ascending: false }).limit(100),
  ]);
  return <div className="space-y-6"><header><h1 className="flex items-center gap-2 text-2xl font-semibold"><FileInput/>Forms</h1><p className="mt-1 text-sm text-muted-foreground">Create secure public lead forms that feed directly into prospect matching, attribution, automation, and consent history.</p></header><HostedFormManager forms={forms ?? []} submissions={submissions ?? []} appUrl={(process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "")}/></div>;
}
