"use client"

import * as React from "react"
import { RotateCcw } from "lucide-react"
import { toast } from "sonner"
import { rollbackImportBatch } from "@/app/actions/prospects"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { ImportBatch } from "@/types/database"

export function ImportHistory({ initialBatches, isAdmin }: { initialBatches: ImportBatch[]; isAdmin: boolean }) {
  const [batches, setBatches] = React.useState(initialBatches)
  const [pending, startTransition] = React.useTransition()
  function rollback(batch: ImportBatch) { startTransition(async () => { const result = await rollbackImportBatch(batch.id); if (result.error) { toast.error(result.error); return } setBatches((items) => items.map((item) => item.id === batch.id ? { ...item, status: "rolled_back", rolled_back_at: new Date() } : item)); toast.success(`Rollback removed ${result.data?.deleted ?? 0} unchanged imported prospects`) }) }
  return <div className="space-y-3">{batches.map((batch) => <article key={batch.id} className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center"><div className="flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-medium">{batch.filename}</h3><Badge variant="outline">{batch.status.replaceAll("_", " ")}</Badge></div><p className="mt-1 text-xs text-muted-foreground">{new Date(batch.created_at).toLocaleString()} · {batch.imported_rows} imported · {batch.failed_rows} failed</p></div>{isAdmin && batch.status === "completed" && <Button variant="outline" size="sm" disabled={pending} onClick={() => rollback(batch)}><RotateCcw/>Safe rollback</Button>}</article>)}{!batches.length && <div className="rounded-xl border border-dashed py-12 text-center text-sm text-muted-foreground">No imports have been recorded yet.</div>}</div>
}
