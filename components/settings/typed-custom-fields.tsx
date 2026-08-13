"use client"

import * as React from "react"
import { Archive, Plus } from "lucide-react"
import { toast } from "sonner"
import { archiveCustomFieldDefinition, createCustomFieldDefinition, type CustomFieldType } from "@/app/actions/custom-fields"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { CustomFieldDefinition } from "@/types/database"

const TYPES: CustomFieldType[] = ["text", "number", "date", "boolean", "single_select", "url", "currency"]

export function TypedCustomFields({ initialDefinitions }: { initialDefinitions: CustomFieldDefinition[] }) {
  const [definitions, setDefinitions] = React.useState(initialDefinitions)
  const [name, setName] = React.useState("")
  const [type, setType] = React.useState<CustomFieldType>("text")
  const [options, setOptions] = React.useState("")
  const [pending, startTransition] = React.useTransition()
  function create() { startTransition(async () => { const result = await createCustomFieldDefinition({ name, field_type: type, options: type === "single_select" ? options.split(",").map((item) => item.trim()).filter(Boolean) : [], is_required: false }); if (result.error || !result.data) { toast.error(result.error ?? "Could not create field"); return } setDefinitions((items) => [...items, result.data!]); setName(""); setOptions(""); toast.success("Custom field created") }) }
  function archive(id: string) { startTransition(async () => { const result = await archiveCustomFieldDefinition(id); if (result.error) { toast.error(result.error); return } setDefinitions((items) => items.filter((item) => item.id !== id)); toast.success("Field archived; existing values were preserved") }) }
  return <div className="space-y-3"><div><h4 className="text-sm font-medium">Typed prospect fields</h4><p className="text-xs text-muted-foreground">Create organization-specific qualification fields. Archived fields retain historical values.</p></div><div className="grid gap-2 sm:grid-cols-[1fr_11rem_1fr_auto]"><Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Field name"/><Select value={type} onValueChange={(value) => setType(value as CustomFieldType)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{TYPES.map((item) => <SelectItem key={item} value={item}>{item.replaceAll("_", " ")}</SelectItem>)}</SelectContent></Select><Input value={options} onChange={(event) => setOptions(event.target.value)} disabled={type !== "single_select"} placeholder="Options, comma separated"/><Button disabled={pending || !name.trim()} onClick={create}><Plus/>Add field</Button></div><div className="divide-y rounded-lg border">{definitions.map((definition) => { const fieldOptions = Array.isArray(definition.options) ? definition.options : []; return <div key={definition.id} className="flex items-center justify-between p-3"><div><p className="text-sm font-medium">{definition.name}</p><p className="text-xs text-muted-foreground">{definition.field_type.replaceAll("_", " ")}{fieldOptions.length ? ` · ${fieldOptions.join(", ")}` : ""}</p></div><Button variant="ghost" size="icon-sm" aria-label={`Archive ${definition.name}`} onClick={() => archive(definition.id)}><Archive/></Button></div> })}{!definitions.length && <p className="p-3 text-xs text-muted-foreground">No typed fields configured.</p>}</div></div>
}
