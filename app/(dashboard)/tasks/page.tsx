import { getTasks } from "@/app/actions/daily-operations"
import { getTeamMembers } from "@/app/actions/team"
import { TasksBoard } from "@/components/daily-operations/tasks-board"

export default async function TasksPage() {
  const [tasksResult, membersResult] = await Promise.all([getTasks(), getTeamMembers()])
  if (tasksResult.error) throw new Error(tasksResult.error)
  return <div className="space-y-6"><header><h2 className="text-2xl font-semibold">Tasks</h2><p className="mt-1 text-sm text-muted-foreground">Coordinate research, proposals, approvals, and team handoffs.</p></header><TasksBoard initialTasks={tasksResult.data ?? []} members={membersResult.data ?? []}/></div>
}
