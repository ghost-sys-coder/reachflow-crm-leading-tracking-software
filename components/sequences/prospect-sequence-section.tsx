"use client"

import * as React from "react"
import { CheckCircle2, Circle, Clock, ListOrdered, SkipForward } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  cancelProspectSequence,
  enrollProspect,
  getProspectActiveSequence,
  getSequences,
} from "@/app/actions/sequences"
import type { ProspectSequenceWithDetails, SequenceWithSteps } from "@/types/database"

const STEP_STATUS_ICON = {
  pending: <Clock   className="size-3.5 text-muted-foreground" />,
  ready:   <Circle  className="size-3.5 text-primary" />,
  skipped: <SkipForward className="size-3.5 text-muted-foreground opacity-50" />,
}

const MESSAGE_TYPE_LABELS: Record<string, string> = {
  instagram_dm: "Instagram DM",
  cold_email:   "Cold email",
  follow_up:    "Follow-up",
  custom:       "Custom",
}

export function ProspectSequenceSection({
  prospectId,
  canEnroll,
}: {
  prospectId: string
  canEnroll: boolean
}) {
  const [active, setActive] = React.useState<ProspectSequenceWithDetails | null>(null)
  const [sequences, setSequences] = React.useState<SequenceWithSteps[]>([])
  const [selectedSeqId, setSelectedSeqId] = React.useState<string>("")
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    setLoading(true)
    Promise.all([
      getProspectActiveSequence(prospectId),
      getSequences(),
    ]).then(([activeRes, seqRes]) => {
      setActive(activeRes.data ?? null)
      setSequences(seqRes.data ?? [])
      setLoading(false)
    })
  }, [prospectId])

  async function handleEnroll() {
    if (!selectedSeqId) return
    setSaving(true)
    const result = await enrollProspect(prospectId, selectedSeqId)
    setSaving(false)
    if (result.error) { toast.error(result.error); return }
    toast.success("Prospect enrolled in sequence")
    const { data } = await getProspectActiveSequence(prospectId)
    setActive(data ?? null)
    setSelectedSeqId("")
  }

  async function handleCancel() {
    if (!active) return
    setSaving(true)
    const result = await cancelProspectSequence(active.id)
    setSaving(false)
    if (result.error) { toast.error(result.error); return }
    toast.success("Sequence cancelled")
    setActive(null)
  }

  if (loading) {
    return <p className="text-xs text-muted-foreground">Loading…</p>
  }

  if (active) {
    const sorted = [...active.steps].sort((a, b) => a.step_number - b.step_number)
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ListOrdered className="size-4 text-primary" />
            <span className="text-sm font-medium">{active.sequence?.name}</span>
          </div>
          {canEnroll && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs text-muted-foreground hover:text-destructive"
              onClick={handleCancel}
              disabled={saving}
            >
              Cancel
            </Button>
          )}
        </div>

        <ol className="space-y-2">
          {sorted.map((s) => (
            <li key={s.id} className="flex items-center gap-2.5 text-xs">
              {STEP_STATUS_ICON[s.status as keyof typeof STEP_STATUS_ICON] ?? STEP_STATUS_ICON.pending}
              <span className={s.status === "skipped" ? "text-muted-foreground line-through" : ""}>
                Day {s.step?.delay_days ?? 0} — {MESSAGE_TYPE_LABELS[s.step?.message_type ?? ""] ?? s.step?.message_type}
              </span>
              {s.status === "ready" && (
                <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                  Draft ready
                </span>
              )}
            </li>
          ))}
        </ol>
      </div>
    )
  }

  if (!canEnroll) {
    return <p className="text-xs text-muted-foreground">No active sequence.</p>
  }

  if (sequences.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        No sequences defined yet. Create one in{" "}
        <a href="/settings?tab=sequences" className="underline">Settings → Sequences</a>.
      </p>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={selectedSeqId} onValueChange={setSelectedSeqId}>
        <SelectTrigger className="h-8 flex-1 text-sm">
          <SelectValue placeholder="Pick a sequence…" />
        </SelectTrigger>
        <SelectContent>
          {sequences.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.name} ({s.steps.length} step{s.steps.length !== 1 ? "s" : ""})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        size="sm"
        className="h-8 shrink-0"
        disabled={!selectedSeqId || saving}
        onClick={handleEnroll}
      >
        {saving ? "Enrolling…" : "Enroll"}
      </Button>
    </div>
  )
}
