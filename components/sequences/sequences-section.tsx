"use client"

import * as React from "react"
import { ListOrdered, Pencil, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { deleteSequence, getSequences } from "@/app/actions/sequences"
import { SequenceDialog } from "@/components/sequences/sequence-dialog"
import type { MemberRole, SequenceWithSteps } from "@/types/database"

const MESSAGE_TYPE_LABELS: Record<string, string> = {
  instagram_dm: "Instagram DM",
  cold_email:   "Cold email",
  follow_up:    "Follow-up",
  custom:       "Custom",
}

export function SequencesSection({
  initialSequences,
  role,
}: {
  initialSequences: SequenceWithSteps[]
  role: MemberRole
}) {
  const [sequences, setSequences] = React.useState(initialSequences)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<SequenceWithSteps | null>(null)
  const canEdit = role !== "viewer"
  const isAdmin = role === "admin"

  async function refresh() {
    const { data } = await getSequences()
    if (data) setSequences(data)
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? Active enrollments will be cancelled.`)) return
    const result = await deleteSequence(id)
    if (result.error) { toast.error(result.error); return }
    toast.success("Sequence deleted")
    setSequences((prev) => prev.filter((s) => s.id !== id))
  }

  function openCreate() {
    setEditing(null)
    setDialogOpen(true)
  }

  function openEdit(seq: SequenceWithSteps) {
    setEditing(seq)
    setDialogOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Define multi-step outreach sequences and enroll prospects from their detail panel.
        </p>
        {canEdit && (
          <Button size="sm" onClick={openCreate}>
            <Plus className="size-3.5" />
            New sequence
          </Button>
        )}
      </div>

      {sequences.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-14 text-center">
          <ListOrdered className="mx-auto mb-3 size-8 text-muted-foreground" />
          <p className="text-sm font-medium">No sequences yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Create a sequence to automate your outreach follow-ups.
          </p>
          {canEdit && (
            <Button size="sm" className="mt-4" onClick={openCreate}>
              <Plus className="size-3.5" />
              Create first sequence
            </Button>
          )}
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {sequences.map((seq) => {
            const sorted = [...seq.steps].sort((a, b) => a.step_number - b.step_number)
            return (
              <li key={seq.id} className="flex items-start gap-4 px-4 py-4">
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <ListOrdered className="size-4" />
                </span>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-sm font-medium">{seq.name}</p>
                  {seq.description && (
                    <p className="text-xs text-muted-foreground">{seq.description}</p>
                  )}
                  <ol className="mt-2 space-y-0.5">
                    {sorted.map((s) => (
                      <li key={s.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-medium">
                          {s.step_number}
                        </span>
                        Day {s.delay_days} — {MESSAGE_TYPE_LABELS[s.message_type] ?? s.message_type}
                      </li>
                    ))}
                  </ol>
                </div>
                {canEdit && (
                  <div className="flex shrink-0 items-center gap-1">
                    <Button variant="ghost" size="icon" className="size-7" onClick={() => openEdit(seq)}>
                      <Pencil className="size-3.5" />
                    </Button>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(seq.id, seq.name)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <SequenceDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        sequence={editing}
        onSaved={refresh}
      />
    </div>
  )
}
