"use client"

import * as React from "react"
import { Plus, Trash2 } from "lucide-react"
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
import { Textarea } from "@/components/ui/textarea"
import { createSequence, updateSequence } from "@/app/actions/sequences"
import type { SequenceWithSteps } from "@/types/database"

const MESSAGE_TYPE_OPTIONS = [
  { value: "instagram_dm", label: "Instagram DM" },
  { value: "cold_email",   label: "Cold email"   },
  { value: "follow_up",    label: "Follow-up"    },
  { value: "custom",       label: "Custom"        },
] as const

type StepForm = {
  delay_days:    number
  message_type:  string
  subject:       string
  body_template: string
}

function defaultStep(delayDays = 0): StepForm {
  return { delay_days: delayDays, message_type: "instagram_dm", subject: "", body_template: "" }
}

export function SequenceDialog({
  open,
  onOpenChange,
  sequence,
  onSaved,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  sequence: SequenceWithSteps | null
  onSaved: () => void
}) {
  const isEdit = Boolean(sequence)
  const [name, setName] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [steps, setSteps] = React.useState<StepForm[]>([defaultStep()])
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      if (sequence) {
        setName(sequence.name)
        setDescription(sequence.description ?? "")
        const sorted = [...sequence.steps].sort((a, b) => a.step_number - b.step_number)
        setSteps(sorted.map((s) => ({
          delay_days:    s.delay_days,
          message_type:  s.message_type,
          subject:       s.subject ?? "",
          body_template: s.body_template,
        })))
      } else {
        setName("")
        setDescription("")
        setSteps([defaultStep()])
      }
    }
  }, [open, sequence])

  function updateStep<K extends keyof StepForm>(i: number, key: K, value: StepForm[K]) {
    setSteps((prev) => prev.map((s, idx) => (idx === i ? { ...s, [key]: value } : s)))
  }

  function addStep() {
    const lastDelay = steps[steps.length - 1]?.delay_days ?? 0
    setSteps((prev) => [...prev, defaultStep(lastDelay + 3)])
  }

  function removeStep(i: number) {
    setSteps((prev) => prev.filter((_, idx) => idx !== i))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const input = {
      name: name.trim(),
      description: description.trim() || undefined,
      steps: steps.map((s) => ({
        delay_days:    s.delay_days,
        message_type:  s.message_type as "instagram_dm" | "cold_email" | "follow_up" | "custom",
        subject:       s.subject.trim() || undefined,
        body_template: s.body_template.trim(),
      })),
    }

    const result = isEdit && sequence
      ? await updateSequence(sequence.id, input)
      : await createSequence(input)

    setSaving(false)
    if (result.error) { toast.error(result.error); return }
    toast.success(isEdit ? "Sequence updated" : "Sequence created")
    onOpenChange(false)
    onSaved()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit sequence" : "New sequence"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="seq-name">Name</Label>
              <Input
                id="seq-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Cold outreach 3-touch"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="seq-desc">Description (optional)</Label>
              <Input
                id="seq-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What this sequence is for"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Steps ({steps.length})
              </Label>
              <Button type="button" variant="outline" size="sm" onClick={addStep} disabled={steps.length >= 10}>
                <Plus className="size-3.5" />
                Add step
              </Button>
            </div>

            <p className="text-[11px] text-muted-foreground">
              Placeholders: <code className="rounded bg-muted px-1">{"{{business_name}}"}</code>{" "}
              <code className="rounded bg-muted px-1">{"{{handle}}"}</code>{" "}
              <code className="rounded bg-muted px-1">{"{{platform}}"}</code>
            </p>

            <div className="space-y-4">
              {steps.map((step, i) => (
                <div key={i} className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">Step {i + 1}</span>
                    {steps.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-6 text-muted-foreground hover:text-destructive"
                        onClick={() => removeStep(i)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    )}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Send on day</Label>
                      <Input
                        type="number"
                        min={0}
                        value={step.delay_days}
                        onChange={(e) => updateStep(i, "delay_days", Math.max(0, parseInt(e.target.value) || 0))}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Message type</Label>
                      <Select
                        value={step.message_type}
                        onValueChange={(v) => updateStep(i, "message_type", v)}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MESSAGE_TYPE_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {step.message_type === "cold_email" && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Subject line</Label>
                      <Input
                        value={step.subject}
                        onChange={(e) => updateStep(i, "subject", e.target.value)}
                        placeholder="e.g. Quick question for {{business_name}}"
                        className="h-8 text-sm"
                      />
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label className="text-xs">Message body</Label>
                    <Textarea
                      rows={4}
                      value={step.body_template}
                      onChange={(e) => updateStep(i, "body_template", e.target.value)}
                      placeholder={"Hey {{business_name}}, I came across your profile…"}
                      required
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : isEdit ? "Save changes" : "Create sequence"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
