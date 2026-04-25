"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Check, ChevronDown, MoreHorizontal } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { PROSPECT_STATUS_LABELS } from "@/components/crm/status-badge"
import { updateProspectStatus } from "@/app/actions/prospects"
import { PROSPECT_STATUSES } from "@/lib/validation/schemas"
import type { ProspectStatus } from "@/db/schema"
import type { Prospect } from "@/types/database"

export function StatusMenu({
  prospect,
  variant = "icon",
}: {
  prospect: Prospect
  variant?: "icon" | "labelled"
}) {
  const router = useRouter()
  const [isPending, startTransition] = React.useTransition()

  function setStatus(status: ProspectStatus) {
    if (status === prospect.status) return

    startTransition(async () => {
      const result = await updateProspectStatus(prospect.id, { status })
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success(`Moved to ${PROSPECT_STATUS_LABELS[status]}`)
      router.refresh()
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {variant === "icon" ? (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Prospect actions"
            disabled={isPending}
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal />
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled={isPending}>
            Status
            <ChevronDown />
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-40"
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenuLabel>Move to</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {PROSPECT_STATUSES.map((status) => (
          <DropdownMenuItem key={status} onSelect={() => setStatus(status)}>
            {status === prospect.status ? <Check /> : <span className="size-3.5" />}
            {PROSPECT_STATUS_LABELS[status]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
