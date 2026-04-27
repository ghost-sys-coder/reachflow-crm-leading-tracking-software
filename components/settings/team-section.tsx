"use client"

import * as React from "react"
import { Check, Clock, Copy, Link2, Loader2, MailPlus, ShieldCheck, Trash2, UserMinus } from "lucide-react"
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
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
import { Separator } from "@/components/ui/separator"
import {
  cancelInvite,
  createInvite,
  removeMember,
  updateMemberRole,
} from "@/app/actions/team"
import { MEMBER_ROLES } from "@/db/schema"
import type { MemberRole } from "@/types/database"
import type { OrganizationInvite, TeamMember } from "@/types/database"

const ROLE_LABELS: Record<MemberRole, string> = {
  admin: "Admin",
  editor: "Editor",
  viewer: "Viewer",
}

const ROLE_BADGE_CLASS: Record<MemberRole, string> = {
  admin: "bg-primary/10 text-primary border-primary/20",
  editor: "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400",
  viewer: "bg-muted text-muted-foreground border-border",
}

function getInitials(fullName: string | null, email: string): string {
  if (fullName) {
    const parts = fullName.trim().split(/\s+/)
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    return parts[0].slice(0, 2).toUpperCase()
  }
  return email.slice(0, 2).toUpperCase()
}

function formatExpiry(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now()
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
  if (days <= 0) return "Expired"
  if (days === 1) return "Expires tomorrow"
  return `Expires in ${days} days`
}

type Props = {
  initialMembers: TeamMember[]
  initialInvites: OrganizationInvite[]
  currentUserId: string
  currentUserRole: MemberRole
}

export function TeamSection({
  initialMembers,
  initialInvites,
  currentUserId,
  currentUserRole,
}: Props) {
  const [members, setMembers] = React.useState<TeamMember[]>(initialMembers)
  const [invites, setInvites] = React.useState<OrganizationInvite[]>(initialInvites)
  const [email, setEmail] = React.useState("")
  const [role, setRole] = React.useState<MemberRole>("viewer")
  const [newToken, setNewToken] = React.useState<string | null>(null)
  const [copied, setCopied] = React.useState(false)
  const [isPending, startTransition] = React.useTransition()

  const isAdmin = currentUserRole === "admin"
  const adminCount = members.filter((m) => m.role === "admin").length

  function buildInviteLink(token: string): string {
    return `${window.location.origin}/invite/${token}`
  }

  function handleCopyLink(token: string) {
    navigator.clipboard.writeText(buildInviteLink(token)).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function handleSendInvite() {
    const trimmed = email.trim()
    if (!trimmed) return

    startTransition(async () => {
      const result = await createInvite({ email: trimmed, role })
      if (result.error) {
        toast.error(result.error)
        return
      }
      setNewToken(result.data!.token)
      setEmail("")
      toast.success("Invite link created! and sent to your teammate's email.")
    })
  }

  function handleCancelInvite(invite: OrganizationInvite) {
    startTransition(async () => {
      const result = await cancelInvite(invite.id)
      if (result.error) {
        toast.error(result.error)
        return
      }
      setInvites((prev) => prev.filter((i) => i.id !== invite.id))
      if (newToken === invite.token) setNewToken(null)
      toast.success("Invite cancelled")
    })
  }

  function handleRemoveMember(member: TeamMember) {
    startTransition(async () => {
      const result = await removeMember(member.id)
      if (result.error) {
        toast.error(result.error)
        return
      }
      setMembers((prev) => prev.filter((m) => m.id !== member.id))
      toast.success("Member removed")
    })
  }

  function handleRoleChange(member: TeamMember, newRole: MemberRole) {
    startTransition(async () => {
      const result = await updateMemberRole(member.id, newRole)
      if (result.error) {
        toast.error(result.error)
        return
      }
      setMembers((prev) =>
        prev.map((m) => (m.id === member.id ? { ...m, role: newRole } : m)),
      )
      toast.success("Role updated")
    })
  }

  return (
    <div className="space-y-6">
      {/* Invite form — admin only */}
      {isAdmin && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Invite your team to collaborate. Links expire after 7 days.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="grid flex-1 gap-1.5">
              <Label htmlFor="invite-email">Email address</Label>
              <Input
                id="invite-email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setNewToken(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    handleSendInvite()
                  }
                }}
                placeholder="teammate@example.com"
              />
            </div>
            <div className="grid gap-1.5 sm:w-36">
              <Label htmlFor="invite-role">Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as MemberRole)}>
                <SelectTrigger id="invite-role" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MEMBER_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={handleSendInvite}
              disabled={!email.trim() || isPending}
            >
              {isPending ? (
                <Loader2 className="animate-spin" />
              ) : (
                <MailPlus />
              )}
              Create invite
            </Button>
          </div>

          {/* Generated link */}
          {newToken && (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2">
              <Link2 className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">
                {buildInviteLink(newToken)}
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => handleCopyLink(newToken)}
                aria-label="Copy invite link"
              >
                {copied ? (
                  <Check className="size-3.5 text-green-500" />
                ) : (
                  <Copy className="size-3.5" />
                )}
              </Button>
            </div>
          )}
        </div>
      )}

      {isAdmin && <Separator />}

      {/* Members list */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Members · {members.length}
        </h4>

        <ul className="divide-y divide-border rounded-lg border border-border">
          {members.map((member) => {
            const isSelf = member.user_id === currentUserId
            const isSoleAdmin = member.role === "admin" && adminCount === 1
            const canRemove = isAdmin && !(isSelf && isSoleAdmin)
            const canChangeRole = isAdmin && !(isSelf && isSoleAdmin)
            const displayName = member.full_name ?? member.email.split("@")[0]

            return (
              <li
                key={member.id}
                className="flex items-center gap-3 px-4 py-3"
              >
                <Avatar className="size-8 shrink-0">
                  <AvatarFallback className="text-xs">
                    {getInitials(member.full_name, member.email)}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium leading-tight">
                    {displayName}
                    {isSelf && (
                      <span className="ml-1.5 text-xs text-muted-foreground">(you)</span>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                </div>

                {canChangeRole ? (
                  <Select
                    value={member.role}
                    onValueChange={(v) => handleRoleChange(member, v as MemberRole)}
                    disabled={isPending}
                  >
                    <SelectTrigger className="h-7 w-24 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MEMBER_ROLES.map((r) => (
                        <SelectItem key={r} value={r} className="text-xs">
                          {ROLE_LABELS[r]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge
                    variant="outline"
                    className={`text-xs ${ROLE_BADGE_CLASS[member.role]}`}
                  >
                    {member.role === "admin" && (
                      <ShieldCheck className="mr-1 size-3" />
                    )}
                    {ROLE_LABELS[member.role]}
                  </Badge>
                )}

                {canRemove ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                        aria-label={`Remove ${displayName}`}
                        disabled={isPending}
                      >
                        <UserMinus />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove {displayName}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          They will lose access to this workspace immediately. This
                          cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={(e) => {
                            e.preventDefault()
                            handleRemoveMember(member)
                          }}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Remove
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : (
                  <div className="size-7.5 shrink-0" />
                )}
              </li>
            )
          })}
        </ul>
      </div>

      {/* Pending invites — admin only */}
      {isAdmin && invites.length > 0 && (
        <>
          <Separator />
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Pending invites · {invites.length}
            </h4>

            <ul className="divide-y divide-border rounded-lg border border-border">
              {invites.map((invite) => (
                <li
                  key={invite.id}
                  className="flex items-center gap-3 px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{invite.email}</p>
                    <div className="mt-0.5 flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`text-xs ${ROLE_BADGE_CLASS[invite.role as MemberRole]}`}
                      >
                        {ROLE_LABELS[invite.role as MemberRole]}
                      </Badge>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="size-3" />
                        {formatExpiry(String(invite.expires_at))}
                      </span>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleCopyLink(invite.token)}
                    aria-label="Copy invite link"
                    disabled={isPending}
                  >
                    <Copy className="size-3.5" />
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                        aria-label={`Cancel invite for ${invite.email}`}
                        disabled={isPending}
                      >
                        <Trash2 />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Cancel invite?</AlertDialogTitle>
                        <AlertDialogDescription>
                          The invite link for {invite.email} will stop working
                          immediately.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Keep</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={(e) => {
                            e.preventDefault()
                            handleCancelInvite(invite)
                          }}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Cancel invite
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  )
}
