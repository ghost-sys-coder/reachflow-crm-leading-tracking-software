"use client"

import * as React from "react"
import Link from "next/link"
import { BookmarkPlus, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { createSavedView, deleteSavedView } from "@/app/actions/daily-operations"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { SavedView } from "@/types/database"

type Filters = { status?: string; platform?: string; q?: string; assigned?: "me" }

function hrefFor(filters: Record<string, unknown>) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) if (typeof value === "string" && value) params.set(key, value)
  return `/prospects?${params.toString()}`
}

export function SavedViewsBar({ initialViews, filters }: { initialViews: SavedView[]; filters: Filters }) {
  const [views, setViews] = React.useState(initialViews)
  const [name, setName] = React.useState("")
  const [pending, startTransition] = React.useTransition()
  function save() { if (!name.trim()) return; startTransition(async () => { const result = await createSavedView({ name, scope: "private", entity_type: "prospects", filters }); if (result.error || !result.data) { toast.error(result.error ?? "Unable to save view"); return } setViews((items) => [...items, result.data!]); setName(""); toast.success("View saved") }) }
  function remove(id: string) { startTransition(async () => { const result = await deleteSavedView(id); if (result.error) { toast.error(result.error); return } setViews((items) => items.filter((item) => item.id !== id)) }) }
  return <section className="flex flex-col gap-3 rounded-xl border bg-card p-3 lg:flex-row lg:items-center"><div className="flex flex-1 flex-wrap gap-2">{views.map((view) => <span key={view.id} className="inline-flex items-center rounded-md border"><Link className="px-3 py-1.5 text-xs hover:bg-muted" href={hrefFor(view.filter_json)}>{view.name}{view.scope === "shared" ? " · Shared" : ""}</Link><button type="button" className="border-l p-1.5 text-muted-foreground hover:text-destructive" aria-label={`Delete ${view.name}`} onClick={() => remove(view.id)}><Trash2 className="size-3"/></button></span>)}{!views.length && <p className="py-1 text-xs text-muted-foreground">No saved views yet.</p>}</div><div className="flex gap-2"><Input className="h-8 w-44" value={name} onChange={(event) => setName(event.target.value)} placeholder="View name"/><Button size="sm" variant="outline" disabled={pending || !name.trim()} onClick={save}><BookmarkPlus/>Save current view</Button></div></section>
}
