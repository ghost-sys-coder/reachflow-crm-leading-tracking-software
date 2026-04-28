"use client"

import * as React from "react"
import { Pencil, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

import {
  createTemplate,
  deleteTemplate,
  updateTemplate,
} from "@/app/actions/templates"
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
import { Textarea } from "@/components/ui/textarea"
import { MESSAGE_TYPES } from "@/lib/validation/schemas"
import type { MessageType } from "@/db/schema"
import type { MessageTemplate } from "@/types/database"

const TYPE_LABELS: Record<string, string> = {
  instagram_dm: "Instagram DM",
  cold_email: "Cold Email",
  follow_up: "Follow-up",
  custom: "Custom",
}

type FormState = {
  name: string
  message_type: string
  subject: string
  body: string
}

const EMPTY_FORM: FormState = {
  name: "",
  message_type: "cold_email",
  subject: "",
  body: "",
}

type Props = {
  initialTemplates: MessageTemplate[]
  role: string
}

export function TemplatesSection({ initialTemplates, role }: Props) {
  const [templates, setTemplates] = React.useState(initialTemplates)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<MessageTemplate | null>(null)
  const [form, setForm] = React.useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = React.useState(false)
  const [deleteId, setDeleteId] = React.useState<string | null>(null)
  const [deleting, setDeleting] = React.useState(false)

  const canEdit = role === "admin" || role === "editor"
  const canDelete = role === "admin"

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  function openEdit(t: MessageTemplate) {
    setEditing(t)
    setForm({
      name: t.name,
      message_type: t.message_type,
      subject: t.subject ?? "",
      body: t.body,
    })
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim() || !form.body.trim()) return
    setSaving(true)
    const input = {
      name: form.name,
      message_type: form.message_type as MessageType,
      subject: form.subject || undefined,
      body: form.body,
    }

    const result = editing
      ? await updateTemplate(editing.id, input)
      : await createTemplate(input)

    setSaving(false)

    if (result.error) {
      toast.error(result.error)
      return
    }

    if (editing) {
      setTemplates((prev) =>
        prev.map((t) => (t.id === result.data!.id ? result.data! : t)),
      )
      toast.success("Template updated")
    } else {
      setTemplates((prev) => [result.data!, ...prev])
      toast.success("Template created")
    }
    setDialogOpen(false)
  }

  async function handleDelete() {
    if (!deleteId) return
    setDeleting(true)
    const result = await deleteTemplate(deleteId)
    setDeleting(false)

    if (result.error) {
      toast.error(result.error)
      return
    }

    setTemplates((prev) => prev.filter((t) => t.id !== deleteId))
    setDeleteId(null)
    toast.success("Template deleted")
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Save reusable message templates with{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
            {"{{variable}}"}
          </code>{" "}
          placeholders. Supported:{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
            prospect_name
          </code>
          ,{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
            handle
          </code>
          ,{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
            platform
          </code>
          ,{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
            agency_name
          </code>
          ,{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
            sender_name
          </code>
          .
        </p>
        {canEdit && (
          <Button size="sm" onClick={openCreate} className="shrink-0">
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            New template
          </Button>
        )}
      </div>

      {templates.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No templates yet.
        </p>
      )}

      <div className="space-y-2">
        {templates.map((t) => (
          <div
            key={t.id}
            className="flex items-start justify-between gap-3 rounded-md border border-border p-3"
          >
            <div className="min-w-0 flex-1 space-y-0.5">
              <p className="truncate text-sm font-medium">{t.name}</p>
              <p className="text-xs text-muted-foreground">
                {TYPE_LABELS[t.message_type] ?? t.message_type}
                {t.subject ? ` · ${t.subject}` : ""}
              </p>
              <p className="line-clamp-2 text-xs text-muted-foreground/80">
                {t.body}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {canEdit && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => openEdit(t)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              )}
              {canDelete && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => setDeleteId(t.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Create / edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit template" : "New template"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="tmpl-name">Name</Label>
              <Input
                id="tmpl-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Instagram cold outreach"
                maxLength={100}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tmpl-type">Type</Label>
              <Select
                value={form.message_type}
                onValueChange={(v) => setForm((f) => ({ ...f, message_type: v }))}
              >
                <SelectTrigger id="tmpl-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MESSAGE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(form.message_type === "cold_email" ||
              form.message_type === "follow_up") && (
              <div className="space-y-1.5">
                <Label htmlFor="tmpl-subject">Subject (optional)</Label>
                <Input
                  id="tmpl-subject"
                  value={form.subject}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, subject: e.target.value }))
                  }
                  placeholder="e.g. Quick question about {{business_name}}"
                  maxLength={200}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="tmpl-body">Body</Label>
              <Textarea
                id="tmpl-body"
                value={form.body}
                onChange={(e) =>
                  setForm((f) => ({ ...f, body: e.target.value }))
                }
                placeholder="Hi {{prospect_name}}, I work with {{agency_name}}..."
                rows={7}
                maxLength={5000}
                className="resize-none font-mono text-xs h-20"
              />
              <p className="text-[11px] text-muted-foreground">
                {form.body.length}/5000 characters
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !form.name.trim() || !form.body.trim()}
            >
              {saving ? "Saving…" : editing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete template?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This cannot be undone. The template will be permanently removed.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteId(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
