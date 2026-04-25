"use client"

import * as React from "react"
import { toast } from "sonner"

import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { updateProspect } from "@/app/actions/prospects"

export function ProspectNotes({
  prospectId,
  initialNotes,
}: {
  prospectId: string
  initialNotes: string | null
}) {
  const [value, setValue] = React.useState(initialNotes ?? "")
  const [savedValue, setSavedValue] = React.useState(initialNotes ?? "")
  const [saving, setSaving] = React.useState(false)

  async function persist() {
    if (value === savedValue) return
    setSaving(true)
    const result = await updateProspect(prospectId, { notes: value })
    setSaving(false)
    if (result.error) {
      toast.error(result.error)
      return
    }
    setSavedValue(value)
  }

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between">
        <Label htmlFor="notes" className="text-xs text-muted-foreground">
          Notes
        </Label>
        <span className="text-[11px] text-muted-foreground">
          {saving ? "Saving..." : value !== savedValue ? "Unsaved" : "Saved"}
        </span>
      </div>
      <Textarea
        id="notes"
        rows={4}
        placeholder="Pain points, prior touchpoints, anything to remember..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={persist}
      />
    </div>
  )
}
