"use client"

import * as React from "react"
import { Copy, FileText } from "lucide-react"
import { toast } from "sonner"

import { getTemplates } from "@/app/actions/templates"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { MessageType } from "@/db/schema"
import type { MessageTemplate } from "@/types/database"

type ProspectVars = {
  business_name?: string | null
  handle?: string | null
  platform?: string | null
}

type OrgVars = {
  agency_name?: string | null
  sender_name?: string | null
}

function resolve(
  body: string,
  prospect: ProspectVars,
  org: OrgVars,
): string {
  return body
    .replace(/\{\{prospect_name\}\}/g, prospect.business_name ?? "{{prospect_name}}")
    .replace(/\{\{business_name\}\}/g, prospect.business_name ?? "{{business_name}}")
    .replace(/\{\{handle\}\}/g, prospect.handle ?? "{{handle}}")
    .replace(/\{\{platform\}\}/g, prospect.platform ?? "{{platform}}")
    .replace(/\{\{agency_name\}\}/g, org.agency_name ?? "{{agency_name}}")
    .replace(/\{\{sender_name\}\}/g, org.sender_name ?? "{{sender_name}}")
}

type Props = {
  messageType: MessageType
  prospect?: ProspectVars
}

export function TemplatePicker({ messageType, prospect = {} }: Props) {
  const [templates, setTemplates] = React.useState<MessageTemplate[]>([])
  const [orgVars, setOrgVars] = React.useState<OrgVars>({})
  const [selectedId, setSelectedId] = React.useState<string>("")
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    let mounted = true
    getTemplates().then((res) => {
      if (!mounted) return
      if (res.data) {
        setTemplates(res.data.templates)
        setOrgVars(res.data.orgVars)
      }
      setLoading(false)
    })
    return () => { mounted = false }
  }, [])

  const filtered = templates.filter(
    (t) => t.message_type === messageType || messageType === "custom",
  )

  const selected = filtered.find((t) => t.id === selectedId) ?? null

  const resolvedBody = selected
    ? resolve(selected.body, prospect, orgVars)
    : null

  const resolvedSubject =
    selected?.subject ? resolve(selected.subject, prospect, orgVars) : null

  function handleCopy() {
    if (!resolvedBody) return
    const text = resolvedSubject ? `${resolvedSubject}\n\n${resolvedBody}` : resolvedBody
    navigator.clipboard
      .writeText(text)
      .then(() => toast.success("Template copied"))
      .catch(() => toast.error("Could not copy"))
  }

  if (!loading && filtered.length === 0) return null

  return (
    <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
      <Label className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
        <FileText className="size-3" />
        Templates
      </Label>

      {loading ? (
        <p className="text-xs text-muted-foreground">Loading templates…</p>
      ) : (
        <Select
          value={selectedId}
          onValueChange={(v) => setSelectedId(v === "__none" ? "" : v)}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Pick a template (optional)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none">
              <span className="text-muted-foreground">None</span>
            </SelectItem>
            {filtered.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {resolvedBody && (
        <div className="space-y-1.5">
          {resolvedSubject && (
            <p className="text-xs font-medium">{resolvedSubject}</p>
          )}
          <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap rounded-md bg-background p-2.5 text-xs leading-relaxed text-foreground/90">
            {resolvedBody}
          </pre>
          <div className="flex justify-end">
            <Button type="button" variant="outline" size="xs" onClick={handleCopy}>
              <Copy className="size-3" />
              Copy
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
