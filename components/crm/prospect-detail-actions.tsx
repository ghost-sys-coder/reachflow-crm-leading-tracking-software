"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { CalendarCheck2, Clock3, MessageCircleReply, Pencil, UserX } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { DeleteProspectButton } from "@/components/crm/delete-prospect-button"
import { EditProspectDialog } from "@/components/crm/edit-prospect-dialog"
import { PROSPECT_STATUS_LABELS } from "@/components/crm/status-badge"
import { updateProspectStatus } from "@/app/actions/prospects"
import type { ProspectStatus } from "@/db/schema"
import type { ProspectWithDetail } from "@/types/database"
import type { CampaignOption } from "@/components/campaigns/campaign-picker"
import { quickActionButtonClassName } from "@/components/crm/quick-action-styles"

const QUICK_STATUSES = ["replied", "booked", "waiting", "dead"] as const satisfies readonly ProspectStatus[]

const QUICK_STATUS_ICONS = {
  replied: MessageCircleReply,
  booked: CalendarCheck2,
  waiting: Clock3,
  dead: UserX,
} satisfies Record<(typeof QUICK_STATUSES)[number], React.ComponentType<{ className?: string }>>

export function ProspectDetailActions({
  prospect,
  industryOptions,
  customPlatforms,
  campaignOptions,
}: {
  prospect: ProspectWithDetail
  industryOptions?: string[]
  customPlatforms?: string[]
  campaignOptions?: CampaignOption[]
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
        {QUICK_STATUSES.map((s) => {
          const Icon = QUICK_STATUS_ICONS[s]
          return (
            <Button
              key={s}
              type="button"
              variant={status === s ? "default" : "outline"}
              size="sm"
              className={quickActionButtonClassName}
              disabled={isPending}
              onClick={() => quickSetStatus(s)}
            >
              <Icon className="size-4" />
              Mark as {PROSPECT_STATUS_LABELS[s].toLowerCase()}
            </Button>
          )
        })}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={quickActionButtonClassName}
          onClick={() => setEditOpen(true)}
        >
          <Pencil />
          Edit
        </Button>
        <DeleteProspectButton
          prospectId={prospect.id}
          prospectName={prospect.business_name}
          onDeleted={() => router.push("/prospects")}
          variant="outline"
          size="sm"
          className={quickActionButtonClassName}
        />
      </div>

      <EditProspectDialog
        prospect={prospect}
        open={editOpen}
        onOpenChange={setEditOpen}
        industryOptions={industryOptions}
        customPlatforms={customPlatforms}
        campaignOptions={campaignOptions}
      />
    </>
  )
}
