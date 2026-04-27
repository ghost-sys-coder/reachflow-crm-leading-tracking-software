"use client"

import * as React from "react"
import { Download } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { exportProspects, type ExportFilters } from "@/app/actions/prospects"

export function ExportProspectsButton({ filters }: { filters: ExportFilters }) {
  const [pending, startTransition] = React.useTransition()

  function handleExport() {
    startTransition(async () => {
      const res = await exportProspects(filters)
      if (res.error) {
        toast.error(res.error)
        return
      }
      const blob = new Blob([res.data ?? ""], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `prospects-${new Date().toISOString().split("T")[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    })
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={pending}>
      <Download className="size-4" />
      {pending ? "Exporting…" : "Export CSV"}
    </Button>
  )
}
