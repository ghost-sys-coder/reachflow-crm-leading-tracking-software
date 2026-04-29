"use client"

import * as React from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
  createCustomFieldDefinition,
  updateCustomFieldDefinition,
} from "@/app/actions/custom-fields"
import type { CustomFieldDefinition } from "@/types/database"

const FIELD_TYPE_OPTIONS = [
  { value: "text",    label: "Text"    },
  { value: "number",  label: "Number"  },
  { value: "boolean", label: "Yes / No" },
  { value: "date",    label: "Date"    },
  { value: "select",  label: "Select (dropdown)" },
] as const

export function CustomFieldDialog({
  open,
  onOpenChange,
  field,
  onSaved,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  field: CustomFieldDefinition | null
  onSaved: () => void
}) {
  const isEdit = Boolean(field)
  const [name, setName] = React.useState("")
  const [fieldType, setFieldType] = React.useState("text")
  const [optionsRaw, setOptionsRaw] = React.useState("")
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      if (field) {
        setName(field.name)
        setFieldType(field.field_type)
        setOptionsRaw(field.options ? (field.options as string[]).join(", ") : "")
      } else {
        setName("")
        setFieldType("text")
        setOptionsRaw("")
      }
    }
  }, [open, field])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const options = fieldType === "select"
      ? optionsRaw.split(",").map((s) => s.trim()).filter(Boolean)
      : undefined

    const input = {
      name: name.trim(),
      field_type: fieldType as "text" | "number" | "boolean" | "date" | "select",
      options,
    }

    const result = isEdit && field
      ? await updateCustomFieldDefinition(field.id, input)
      : await createCustomFieldDefinition(input)

    setSaving(false)
    if (result.error) { toast.error(result.error); return }
    toast.success(isEdit ? "Field updated" : "Field created")
    onOpenChange(false)
    onSaved()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit custom field" : "New custom field"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cf-name">Field name</Label>
            <Input
              id="cf-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Budget, Decision maker, Deal size"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cf-type">Type</Label>
            <Select value={fieldType} onValueChange={setFieldType}>
              <SelectTrigger id="cf-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FIELD_TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {fieldType === "select" && (
            <div className="space-y-1.5">
              <Label htmlFor="cf-options">Options (comma-separated)</Label>
              <Input
                id="cf-options"
                value={optionsRaw}
                onChange={(e) => setOptionsRaw(e.target.value)}
                placeholder="e.g. Small, Medium, Large"
              />
              <p className="text-[11px] text-muted-foreground">
                Each value separated by a comma becomes a dropdown option.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : isEdit ? "Save changes" : "Create field"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
