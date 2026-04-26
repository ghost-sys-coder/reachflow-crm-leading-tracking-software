"use client"

import * as React from "react"
import { Plus, Tag as TagIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { TAG_COLOR_OPTIONS, TagPill } from "@/components/crm/tag-pill"
import {
  addTagToProspect,
  createTag,
  removeTagFromProspect,
} from "@/app/actions/tags"
import { cn } from "@/lib/utils"
import type { Tag } from "@/types/database"

export function TagManager({
  prospectId,
  allTags,
  appliedTags,
}: {
  prospectId: string
  allTags: Tag[]
  appliedTags: Tag[]
}) {
  const [newName, setNewName] = React.useState("")
  const [newColor, setNewColor] = React.useState("blue")
  const [isPending, startTransition] = React.useTransition()

  const appliedIds = new Set(appliedTags.map((t) => t.id))

  function toggleApplied(tag: Tag) {
    startTransition(async () => {
      const action = appliedIds.has(tag.id)
        ? removeTagFromProspect(prospectId, tag.id)
        : addTagToProspect(prospectId, tag.id)
      const result = await action
      if (result.error) toast.error(result.error)
    })
  }

  function handleCreate() {
    const trimmed = newName.trim()
    if (!trimmed) return

    startTransition(async () => {
      const created = await createTag({ name: trimmed, color: newColor })
      if (created.error || !created.data) {
        toast.error(created.error ?? "Could not create tag")
        return
      }
      const applied = await addTagToProspect(prospectId, created.data.id)
      if (applied.error) {
        toast.error(applied.error)
        return
      }
      setNewName("")
      toast.success(`Tag "${created.data.name}" created`)
    })
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="xs" disabled={isPending}>
          <TagIcon />
          Tags
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        <p className="pb-1.5 text-xs font-medium">Apply tags</p>

        {allTags.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No tags yet. Create your first below.
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {allTags.map((tag) => {
              const applied = appliedIds.has(tag.id)
              return (
                <button
                  key={tag.id}
                  type="button"
                  aria-pressed={applied}
                  aria-label={`${applied ? "Remove" : "Add"} tag ${tag.name}`}
                  onClick={() => toggleApplied(tag)}
                  disabled={isPending}
                  className={cn(
                    "rounded-full transition-opacity",
                    applied ? "opacity-100" : "opacity-55 hover:opacity-100",
                  )}
                >
                  <TagPill name={tag.name} color={tag.color} />
                </button>
              )
            })}
          </div>
        )}

        <Separator className="my-3" />

        <p className="pb-1.5 text-xs font-medium">Create new tag</p>
        <div className="space-y-2">
          <div className="grid gap-1.5">
            <Label htmlFor="tag-name" className="text-xs text-muted-foreground">
              Name
            </Label>
            <Input
              id="tag-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Warm lead"
              maxLength={50}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="tag-color" className="text-xs text-muted-foreground">
              Color
            </Label>
            <Select value={newColor} onValueChange={setNewColor}>
              <SelectTrigger id="tag-color" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TAG_COLOR_OPTIONS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            size="sm"
            className="w-full"
            disabled={!newName.trim() || isPending}
            onClick={handleCreate}
          >
            <Plus />
            Create and apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
