"use client"

import * as React from "react"
import { Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  createOrgIndustry,
  deleteOrgIndustry,
  createOrgCustomPlatform,
  deleteOrgCustomPlatform,
  type CustomFieldItem,
} from "@/app/actions/custom-fields"
import { PLATFORMS } from "@/db/schema"

const STANDARD_PLATFORM_LABELS: Record<string, string> = {
  instagram: "Instagram",
  email:     "Email",
  facebook:  "Facebook",
  linkedin:  "LinkedIn",
  twitter:   "X / Twitter",
  other:     "Other",
}

function FieldList({
  label,
  description,
  items,
  onAdd,
  onDelete,
  placeholder,
  maxLength,
  isPending,
}: {
  label: string
  description: string
  items: CustomFieldItem[]
  onAdd: (name: string) => void
  onDelete: (item: CustomFieldItem) => void
  placeholder: string
  maxLength: number
  isPending: boolean
}) {
  const [input, setInput] = React.useState("")

  function handleAdd() {
    const trimmed = input.trim()
    if (!trimmed) return
    onAdd(trimmed)
    setInput("")
  }

  return (
    <div className="space-y-3">
      {(label || description) && (
        <div>
          {label && <h4 className="text-sm font-medium">{label}</h4>}
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
      )}

      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAdd() } }}
          placeholder={placeholder}
          maxLength={maxLength}
          className="flex-1"
        />
        <Button
          type="button"
          size="sm"
          onClick={handleAdd}
          disabled={!input.trim() || isPending}
        >
          <Plus />
          Add
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">No custom entries yet.</p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between px-3 py-2">
              <span className="text-sm">{item.name}</span>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    disabled={isPending}
                  >
                    <Trash2 />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remove &ldquo;{item.name}&rdquo;?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This removes it from the selection list. Existing prospects that use it are
                      not affected.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={(e) => { e.preventDefault(); onDelete(item) }}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Remove
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function CustomFieldsSection({
  initialIndustries,
  initialCustomPlatforms,
}: {
  initialIndustries: CustomFieldItem[]
  initialCustomPlatforms: CustomFieldItem[]
}) {
  const [industries, setIndustries] = React.useState(initialIndustries)
  const [customPlatforms, setCustomPlatforms] = React.useState(initialCustomPlatforms)
  const [isPending, startTransition] = React.useTransition()

  function handleAddIndustry(name: string) {
    startTransition(async () => {
      const result = await createOrgIndustry(name)
      if (result.error) { toast.error(result.error); return }
      setIndustries((prev) => [...prev, result.data!].sort((a, b) => a.name.localeCompare(b.name)))
      toast.success(`Industry "${name}" added`)
    })
  }

  function handleDeleteIndustry(item: CustomFieldItem) {
    startTransition(async () => {
      const result = await deleteOrgIndustry(item.id)
      if (result.error) { toast.error(result.error); return }
      setIndustries((prev) => prev.filter((i) => i.id !== item.id))
      toast.success(`Industry "${item.name}" removed`)
    })
  }

  function handleAddPlatform(name: string) {
    startTransition(async () => {
      const result = await createOrgCustomPlatform(name)
      if (result.error) { toast.error(result.error); return }
      setCustomPlatforms((prev) => [...prev, result.data!].sort((a, b) => a.name.localeCompare(b.name)))
      toast.success(`Platform "${name}" added`)
    })
  }

  function handleDeletePlatform(item: CustomFieldItem) {
    startTransition(async () => {
      const result = await deleteOrgCustomPlatform(item.id)
      if (result.error) { toast.error(result.error); return }
      setCustomPlatforms((prev) => prev.filter((p) => p.id !== item.id))
      toast.success(`Platform "${item.name}" removed`)
    })
  }

  return (
    <div className="space-y-6">
      <FieldList
        label="Industries"
        description="Define the industries your team targets. These appear as options in the prospect form."
        items={industries}
        onAdd={handleAddIndustry}
        onDelete={handleDeleteIndustry}
        placeholder="e.g. Healthcare, SaaS, Trades"
        maxLength={100}
        isPending={isPending}
      />

      <Separator />

      <div className="space-y-3">
        <div>
          <h4 className="text-sm font-medium">Custom platforms</h4>
          <p className="text-xs text-muted-foreground">
            Add platforms beyond the built-in set. Built-in:{" "}
            {PLATFORMS.map((p) => STANDARD_PLATFORM_LABELS[p]).join(", ")}.
          </p>
        </div>

        <FieldList
          label=""
          description=""
          items={customPlatforms}
          onAdd={handleAddPlatform}
          onDelete={handleDeletePlatform}
          placeholder="e.g. TikTok, Discord, Threads"
          maxLength={50}
          isPending={isPending}
        />
      </div>
    </div>
  )
}
