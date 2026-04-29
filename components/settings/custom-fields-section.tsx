"use client"

import * as React from "react"
import { Hash, Pencil, Plus, SlidersHorizontal, Text, ToggleLeft, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  deleteCustomFieldDefinition,
  getCustomFieldDefinitions,
} from "@/app/actions/custom-fields"
import { CustomFieldDialog } from "@/components/settings/custom-field-dialog"
import type { CustomFieldDefinition } from "@/types/database"

const TYPE_ICONS: Record<string, React.ReactNode> = {
  text:    <Text         className="size-3.5" />,
  number:  <Hash         className="size-3.5" />,
  boolean: <ToggleLeft   className="size-3.5" />,
  date:    <SlidersHorizontal className="size-3.5" />,
  select:  <SlidersHorizontal className="size-3.5" />,
}

const TYPE_LABELS: Record<string, string> = {
  text:    "Text",
  number:  "Number",
  boolean: "Yes / No",
  date:    "Date",
  select:  "Select",
}

export function CustomFieldsSection({
  initialFields,
}: {
  initialFields: CustomFieldDefinition[]
}) {
  const [fields, setFields] = React.useState(initialFields)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<CustomFieldDefinition | null>(null)

  async function refresh() {
    const { data } = await getCustomFieldDefinitions()
    if (data) setFields(data)
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? Existing values on prospects will be removed on next save.`)) return
    const result = await deleteCustomFieldDefinition(id)
    if (result.error) { toast.error(result.error); return }
    toast.success("Field deleted")
    setFields((prev) => prev.filter((f) => f.id !== id))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Add extra fields to every prospect — e.g. Budget, Decision maker, Deal stage.
        </p>
        <Button size="sm" onClick={() => { setEditing(null); setDialogOpen(true) }}>
          <Plus className="size-3.5" />
          Add field
        </Button>
      </div>

      {fields.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-14 text-center">
          <SlidersHorizontal className="mx-auto mb-3 size-8 text-muted-foreground" />
          <p className="text-sm font-medium">No custom fields yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Custom fields appear on every prospect's detail panel.
          </p>
          <Button size="sm" className="mt-4" onClick={() => { setEditing(null); setDialogOpen(true) }}>
            <Plus className="size-3.5" />
            Add first field
          </Button>
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {fields.map((f) => (
            <li key={f.id} className="flex items-center gap-3 px-4 py-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                {TYPE_ICONS[f.field_type]}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{f.name}</p>
                <p className="text-xs text-muted-foreground">
                  {TYPE_LABELS[f.field_type] ?? f.field_type}
                  {f.field_type === "select" && f.options
                    ? ` — ${(f.options as string[]).join(", ")}`
                    : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  onClick={() => { setEditing(f); setDialogOpen(true) }}
                >
                  <Pencil className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-muted-foreground hover:text-destructive"
                  onClick={() => handleDelete(f.id, f.name)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <CustomFieldDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        field={editing}
        onSaved={refresh}
      />
    </div>
  )
}
