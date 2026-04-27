import type { TeamMember } from "@/types/database"

function initials(name: string | null, email: string): string {
  const source = name?.trim() || email
  const parts = source.split(/\s+/)
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function AssigneeAvatar({
  assignedTo,
  teamMembers,
}: {
  assignedTo: string | null
  teamMembers: TeamMember[]
}) {
  if (!assignedTo) return null
  const member = teamMembers.find((m) => m.user_id === assignedTo)
  if (!member) return null

  const label = member.full_name || member.email

  return (
    <span
      title={`Assigned to ${label}`}
      aria-label={`Assigned to ${label}`}
      className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary select-none"
    >
      {initials(member.full_name, member.email)}
    </span>
  )
}
