"use client"

import * as React from "react"
import { UserCircle } from "lucide-react"
import { toast } from "sonner"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { assignProspect } from "@/app/actions/prospects"
import type { TeamMember } from "@/types/database"

function initials(name: string | null, email: string): string {
  const source = name?.trim() || email
  const parts = source.split(/\s+/)
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function AssigneePicker({
  prospectId,
  currentAssigneeId,
  teamMembers,
}: {
  prospectId: string
  currentAssigneeId: string | null
  teamMembers: TeamMember[]
}) {
  const [isPending, startTransition] = React.useTransition()

  const current = teamMembers.find((m) => m.user_id === currentAssigneeId) ?? null

  function handleChange(value: string) {
    const userId = value === "__none__" ? null : value
    startTransition(async () => {
      const result = await assignProspect(prospectId, userId)
      if (result.error) toast.error(result.error)
      else toast.success(userId ? "Lead assigned" : "Lead unassigned")
    })
  }

  return (
    <div className="space-y-3">
      {/* Current assignee display */}
      <div className="flex items-center gap-2.5">
        {current ? (
          <>
            <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary select-none">
              {initials(current.full_name, current.email)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {current.full_name || current.email}
              </p>
              {current.full_name && (
                <p className="truncate text-xs text-muted-foreground">{current.email}</p>
              )}
            </div>
          </>
        ) : (
          <>
            <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <UserCircle className="size-4" />
            </span>
            <p className="text-sm text-muted-foreground">Unassigned</p>
          </>
        )}
      </div>

      {/* Reassign select */}
      <Select
        value={currentAssigneeId ?? "__none__"}
        onValueChange={handleChange}
        disabled={isPending}
      >
        <SelectTrigger className="h-8 text-sm">
          <SelectValue placeholder="Assign to…" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">Unassigned</SelectItem>
          {teamMembers.map((m) => (
            <SelectItem key={m.user_id} value={m.user_id}>
              {m.full_name || m.email}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
