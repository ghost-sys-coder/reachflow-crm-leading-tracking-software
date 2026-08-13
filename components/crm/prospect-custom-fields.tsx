"use client"

import * as React from "react"
import { toast } from "sonner"
import { setProspectCustomFieldValue } from "@/app/actions/custom-fields"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { CustomFieldDefinition, CustomFieldValue } from "@/types/database"

export function ProspectCustomFields({ prospectId, definitions, initialValues }: { prospectId: string; definitions: CustomFieldDefinition[]; initialValues: CustomFieldValue[] }) {
  const initial = Object.fromEntries(initialValues.map((item) => [item.definition_id, item.value]))
  const [values, setValues] = React.useState<Record<string, unknown>>(initial)
  const [pending, startTransition] = React.useTransition()
  function save(definition: CustomFieldDefinition) { startTransition(async () => { let value = values[definition.id] ?? null; if (["number", "currency"].includes(definition.field_type) && value !== "" && value !== null) value = Number(value); if (definition.field_type === "boolean") value = value === true || value === "true"; const result = await setProspectCustomFieldValue(prospectId, definition.id, value); if (result.error) { toast.error(`${definition.name}: ${result.error}`); return } toast.success(`${definition.name} saved`) }) }
  if (!definitions.length) return <p className="text-xs text-muted-foreground">No custom qualification fields configured.</p>
  return <div className="space-y-3">{definitions.map((definition) => <div key={definition.id} className="grid gap-1.5"><Label htmlFor={`custom-${definition.id}`}>{definition.name}{definition.is_required ? " *" : ""}</Label><div className="flex gap-2">{definition.field_type === "single_select" ? <Select value={String(values[definition.id] ?? "")} onValueChange={(value) => setValues((items) => ({ ...items, [definition.id]: value }))}><SelectTrigger id={`custom-${definition.id}`}><SelectValue placeholder="Select..."/></SelectTrigger><SelectContent>{definition.options.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select> : definition.field_type === "boolean" ? <Select value={String(values[definition.id] ?? "false")} onValueChange={(value) => setValues((items) => ({ ...items, [definition.id]: value }))}><SelectTrigger id={`custom-${definition.id}`}><SelectValue/></SelectTrigger><SelectContent><SelectItem value="true">Yes</SelectItem><SelectItem value="false">No</SelectItem></SelectContent></Select> : <Input id={`custom-${definition.id}`} type={definition.field_type === "date" ? "date" : ["number", "currency"].includes(definition.field_type) ? "number" : definition.field_type === "url" ? "url" : "text"} value={String(values[definition.id] ?? "")} onChange={(event) => setValues((items) => ({ ...items, [definition.id]: event.target.value }))}/>}<Button size="sm" variant="outline" disabled={pending} onClick={() => save(definition)}>Save</Button></div>{definition.help_text && <p className="text-[11px] text-muted-foreground">{definition.help_text}</p>}</div>)}</div>
}
