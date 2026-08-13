import { getImportBatches } from "@/app/actions/prospects"
import { getAuthedOrgClient } from "@/lib/auth/org"
import { ImportHistory } from "@/components/crm/import-history"

export default async function ImportsPage() {
  const [result, context] = await Promise.all([getImportBatches(), getAuthedOrgClient()])
  if (result.error) throw new Error(result.error)
  return <div className="space-y-6"><header><h2 className="text-2xl font-semibold">Import history</h2><p className="mt-1 text-sm text-muted-foreground">Audit every CSV batch and safely remove only prospects that have not changed since import.</p></header><ImportHistory initialBatches={result.data ?? []} isAdmin={context.ctx?.role === "admin"}/></div>
}
