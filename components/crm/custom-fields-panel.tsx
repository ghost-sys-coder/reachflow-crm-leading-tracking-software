"use client"

import * as React from "react"
import { toast } from "sonner"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  getCustomFieldDefinitions,
  updateProspectCustomFields,
} from "@/app/actions/custom-fields"
import type { CustomFieldDefinition, CustomFieldValues } from "@/types/database"

function FieldInput({
  def,
  value,
  onChange,
  onBlur,
}: {
  def: CustomFieldDefinition
  value: string | number | boolean | null | undefined
  onChange: (v: string | number | boolean | null) => void
  onBlur: () => void
}) {
  const str = value == null ? "" : String(value)

  switch (def.field_type) {
    case "boolean":
      return (
        <input
          type="checkbox"
          className="size-4 cursor-pointer accent-primary"
          checked={Boolean(value)}
          onChange={(e) => { onChange(e.target.checked); onBlur() }}
        />
      )
    case "number":
      return (
        <Input
          type="number"
          className="h-7 text-sm"
          value={str}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
          onBlur={onBlur}
        />
      )
    case "date":
      return (
        <Input
          type="date"
          className="h-7 text-sm"
          value={str}
          onChange={(e) => onChange(e.target.value || null)}
          onBlur={onBlur}
        />
      )
    case "select": {
      const options = (def.options as string[] | null) ?? []
      return (
        <Select
          value={str || "__none__"}
          onValueChange={(v) => { onChange(v === "__none__" ? null : v); onBlur() }}
        >
          <SelectTrigger className="h-7 text-sm">
            <SelectValue placeholder="Select…" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">—</SelectItem>
            {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          </SelectContent>
        </Select>
      )
    }
    default:
      return (
        <Input
          type="text"
          className="h-7 text-sm"
          value={str}
          onChange={(e) => onChange(e.target.value || null)}
          onBlur={onBlur}
        />
      )
  }
}

export function CustomFieldsPanel({
  prospectId,
  initialValues,
}: {
  prospectId: string
  initialValues: CustomFieldValues
}) {
  const [defs, setDefs] = React.useState<CustomFieldDefinition[]>([])
  const [values, setValues] = React.useState<CustomFieldValues>(initialValues)
  const [loading, setLoading] = React.useState(true)
  const saveRef = React.useRef<CustomFieldValues>(initialValues)

  React.useEffect(() => {
    getCustomFieldDefinitions().then(({ data }) => {
      setDefs(data ?? [])
      setLoading(false)
    })
  }, [])

  // keep saveRef in sync so the save closure always sees latest values
  React.useEffect(() => { saveRef.current = values }, [values])

  async function save() {
    const result = await updateProspectCustomFields(prospectId, saveRef.current)
    if (result.error) toast.error(result.error)
  }

  if (loading) return <p className="text-xs text-muted-foreground">Loading…</p>

  if (defs.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        No custom fields defined. Admins can add them in{" "}
        <a href="/settings?tab=custom-fields" className="underline">Settings → Custom Fields</a>.
      </p>
    )
  }

  return (
    <div className="grid gap-3">
      {defs.map((def) => (
        <div key={def.id} className="grid grid-cols-[7rem_1fr] items-center gap-2">
          <Label className="truncate text-xs text-muted-foreground">{def.name}</Label>
          <FieldInput
            def={def}
            value={values[def.id] ?? null}
            onChange={(v) => setValues((prev) => ({ ...prev, [def.id]: v }))}
            onBlur={save}
          />
        </div>
      ))}
    </div>
  )
}
