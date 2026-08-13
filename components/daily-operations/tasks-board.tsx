"use client"

import * as React from "react"
import { toast } from "sonner"
import { createTask, setTaskCompleted } from "@/app/actions/daily-operations"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Task, TeamMember } from "@/types/database"

export function TasksBoard({ initialTasks, members }: { initialTasks: Task[]; members: TeamMember[] }) {
  const [tasks, setTasks] = React.useState(initialTasks)
  const [title, setTitle] = React.useState("")
  const [assignedTo, setAssignedTo] = React.useState("unassigned")
  const [dueAt, setDueAt] = React.useState("")
  const [pending, startTransition] = React.useTransition()
  function add() { if (!title.trim()) return; startTransition(async () => { const result = await createTask({ title, assigned_to: assignedTo === "unassigned" ? null : assignedTo, due_at: dueAt ? new Date(dueAt) : null, priority: "normal" }); if (result.error || !result.data) { toast.error(result.error ?? "Could not create task"); return } setTasks((items) => [...items, result.data!]); setTitle(""); setDueAt(""); toast.success("Task created") }) }
  function toggle(task: Task) { startTransition(async () => { const result = await setTaskCompleted(task.id, task.status !== "completed"); if (result.error || !result.data) { toast.error(result.error ?? "Could not update task"); return } setTasks((items) => items.map((item) => item.id === task.id ? result.data! : item)) }) }
  return <div className="space-y-6"><section className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-[1fr_14rem_14rem_auto]"><Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="What needs to be done?"/><Select value={assignedTo} onValueChange={setAssignedTo}><SelectTrigger><SelectValue placeholder="Assignee"/></SelectTrigger><SelectContent><SelectItem value="unassigned">Unassigned</SelectItem>{members.map((member) => <SelectItem key={member.user_id} value={member.user_id}>{member.full_name ?? member.email}</SelectItem>)}</SelectContent></Select><Input type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)}/><Button disabled={pending || !title.trim()} onClick={add}>Create task</Button></section><div className="space-y-3">{tasks.map((task) => <article key={task.id} className="flex items-center gap-3 rounded-xl border bg-card p-4"><button type="button" aria-label="Toggle task" className="size-5 rounded border" onClick={() => toggle(task)}>{task.status === "completed" ? "✓" : ""}</button><div className="flex-1"><p className={task.status === "completed" ? "line-through text-muted-foreground" : "font-medium"}>{task.title}</p><p className="text-xs text-muted-foreground">{task.due_at ? new Date(task.due_at).toLocaleString() : "No due date"} · {members.find((member) => member.user_id === task.assigned_to)?.full_name ?? "Unassigned"}</p></div></article>)}{!tasks.length && <div className="rounded-xl border border-dashed py-12 text-center text-sm text-muted-foreground">No tasks yet.</div>}</div></div>
}
