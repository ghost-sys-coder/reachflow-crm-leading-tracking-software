"use client"

import * as React from "react"
import { Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
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
import { Separator } from "@/components/ui/separator"
import { TAG_COLOR_OPTIONS, TagPill } from "@/components/crm/tag-pill"
import { createTag, deleteTag } from "@/app/actions/tags"
import type { Tag } from "@/types/database"

export function TagsSection({ initialTags }: { initialTags: Tag[] }) {
  const [tags, setTags] = React.useState<Tag[]>(initialTags)
  const [name, setName] = React.useState("")
  const [color, setColor] = React.useState("blue")
  const [isPending, startTransition] = React.useTransition()

  function handleCreate() {
    const trimmed = name.trim()
    if (!trimmed) return

    startTransition(async () => {
      const result = await createTag({ name: trimmed, color })
      if (result.error) {
        toast.error(result.error)
        return
      }
      setTags((prev) =>
        [...prev, result.data as Tag].sort((a, b) => a.name.localeCompare(b.name)),
      )
      setName("")
      toast.success(`Tag "${trimmed}" created`)
    })
  }

  function handleDelete(tag: Tag) {
    startTransition(async () => {
      const result = await deleteTag(tag.id)
      if (result.error) {
        toast.error(result.error)
        return
      }
      setTags((prev) => prev.filter((t) => t.id !== tag.id))
      toast.success(`Tag "${tag.name}" deleted`)
    })
  }

  return (
    <div className="space-y-6">
      {/* Create */}
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Tags help you categorise and filter prospects across your pipeline.
        </p>

        <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-muted/20 p-4 shadow-sm sm:flex-row sm:items-end">
          <div className="grid flex-1 gap-1.5">
            <Label htmlFor="tag-name">Tag name</Label>
            <Input
              id="tag-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  handleCreate()
                }
              }}
              placeholder="Warm lead, Plumber, Follow-up..."
              maxLength={50}
              className="h-10 bg-background"
            />
          </div>
          <div className="grid gap-1.5 sm:w-36">
            <Label htmlFor="tag-color">Color</Label>
            <Select value={color} onValueChange={setColor}>
              <SelectTrigger id="tag-color" className="w-full bg-background data-[size=default]:h-10">
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
            className="h-10 w-full shrink-0 gap-2 px-5 shadow-sm shadow-primary/25 transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-md hover:shadow-primary/20 active:translate-y-0 sm:w-auto sm:self-end"
            onClick={handleCreate}
            disabled={!name.trim() || isPending}
          >
            <Plus />
            Create tag
          </Button>
        </div>
      </div>

      <Separator />

      {/* List */}
      {tags.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No tags yet. Create your first tag above.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {tags.map((tag) => (
            <li
              key={tag.id}
              className="flex items-center justify-between gap-3 px-4 py-2.5"
            >
              <TagPill name={tag.name} color={tag.color} />
              <span className="text-xs text-muted-foreground capitalize">
                {tag.color}
              </span>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="ml-auto text-muted-foreground hover:text-destructive"
                    aria-label={`Delete ${tag.name}`}
                    disabled={isPending}
                  >
                    <Trash2 />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete &quot;{tag.name}&quot;?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This removes the tag from all prospects. This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={(e) => {
                        e.preventDefault()
                        handleDelete(tag)
                      }}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
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
