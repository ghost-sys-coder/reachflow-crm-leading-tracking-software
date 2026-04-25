"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Pencil } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { DeleteProspectButton } from "@/components/crm/delete-prospect-button"
import { EditProspectDialog } from "@/components/crm/edit-prospect-dialog"
import { PROSPECT_STATUS_LABELS } from "@/components/crm/status-badge"
import { updateProspectStatus } from "@/app/actions/prospects"
import type { ProspectStatus } from "@/db/schema"
import type { ProspectWithDetail } from "@/types/database"

const QUICK_STATUSES: ProspectStatus[] = ["replied", "booked", "waiting", "dead"]

export function ProspectDetailActions({
  prospect,
  industrySuggestions,
}: {
  prospect: ProspectWithDetail
  industrySuggestions: string[]
}) {
  const router = useRouter()
  const [editOpen, setEditOpen] = React.useState(false)
  const [isPending, startTransition] = React.useTransition()
  const status = prospect.status as ProspectStatus

  function quickSetStatus(s: ProspectStatus) {
    if (s === status) return
    startTransition(async () => {
      const result = await updateProspectStatus(prospect.id, { status: s })
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(`Moved to ${PROSPECT_STATUS_LABELS[s]}`)
        router.refresh()
      }
    })
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {QUICK_STATUSES.map((s) => (
          <Button
            key={s}
            type="button"
            variant={status === s ? "default" : "outline"}
            size="xs"
            disabled={isPending}
            onClick={() => quickSetStatus(s)}
          >
            Mark as {PROSPECT_STATUS_LABELS[s].toLowerCase()}
          </Button>
        ))}
        <Button
          type="button"
          variant="outline"
          size="xs"
          onClick={() => setEditOpen(true)}
        >
          <Pencil />
          Edit
        </Button>
        <DeleteProspectButton
          prospectId={prospect.id}
          prospectName={prospect.business_name}
          onDeleted={() => router.push("/prospects")}
        />
      </div>

      <EditProspectDialog
        prospect={prospect}
        open={editOpen}
        onOpenChange={setEditOpen}
        industrySuggestions={industrySuggestions}
      />
    </>
  )
}
