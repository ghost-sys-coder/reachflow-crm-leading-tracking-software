"use client"

import * as React from "react"
import Link from "next/link"
import {
  Check,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Send,
  Trash2,
} from "lucide-react"
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
import { Separator } from "@/components/ui/separator"
import { PlatformIcon } from "@/components/crm/platform-icon"
import {
  MESSAGE_TYPE_ICONS,
  MESSAGE_TYPE_LABELS,
} from "@/components/crm/message-meta"
import { deleteMessage, markMessageAsSent } from "@/app/actions/messages"
import { cn } from "@/lib/utils"
import type { MessageType, Platform } from "@/db/schema"
import type { MessageWithProspect } from "@/types/database"

function formatDateTime(value: string | Date | null) {
  if (!value) return null
  const date = typeof value === "string" ? new Date(value) : value
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

export function MessagesList({
  messages,
}: {
  messages: MessageWithProspect[]
}) {
  return (
    <ul className="space-y-3">
      {messages.map((m) => (
        <MessageCard key={m.id} message={m} />
      ))}
    </ul>
  )
}

function MessageCard({ message }: { message: MessageWithProspect }) {
  const [copied, setCopied] = React.useState(false)
  const [isPending, startTransition] = React.useTransition()
  const [optimisticSent, setOptimisticSent] = React.useState(message.was_sent)
  const [removed, setRemoved] = React.useState(false)

  const messageType = message.message_type as MessageType
  const TypeIcon = MESSAGE_TYPE_ICONS[messageType]
  const platform = message.prospect.platform as Platform

  async function handleCopy() {
    try {
      const payload = message.subject
        ? `${message.subject}\n\n${message.content}`
        : message.content
      await navigator.clipboard.writeText(payload)
      setCopied(true)
      toast.success("Copied to clipboard")
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Could not copy")
    }
  }

  function handleMarkSent() {
    setOptimisticSent(true)
    startTransition(async () => {
      const result = await markMessageAsSent(message.id)
      if (result.error !== null) {
        setOptimisticSent(false)
        toast.error(result.error)
        return
      }
      toast.success("Marked as sent")
    })
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteMessage(message.id)
      if (result.error !== null) {
        toast.error(result.error)
        return
      }
      setRemoved(true)
      toast.success("Message deleted")
    })
  }

  if (removed) return null

  return (
    <li className="rounded-xl border border-border bg-card p-4 text-card-foreground ring-1 ring-foreground/10 transition-colors hover:border-primary/30">
      {/* Header row */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
            <TypeIcon className="size-3" />
            {MESSAGE_TYPE_LABELS[messageType]}
          </span>

          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
              optimisticSent
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-amber-500/10 text-amber-600 dark:text-amber-400",
            )}
          >
            {optimisticSent ? (
              <>
                <CheckCircle2 className="size-3" />
                Sent
              </>
            ) : (
              <>
                <Clock className="size-3" />
                Draft
              </>
            )}
          </span>
        </div>

        <span className="text-[11px] text-muted-foreground">
          {formatDateTime(message.sent_at ?? message.created_at)}
        </span>
      </div>

      {/* Prospect link */}
      <Link
        href={`/pipeline?prospect=${message.prospect.id}`}
        className="group/link mt-3 inline-flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary"
      >
        <span className="inline-flex size-5 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <PlatformIcon platform={platform} className="size-3" />
        </span>
        <span className="hover:underline">{message.prospect.business_name}</span>
        {message.prospect.handle && (
          <span className="text-xs font-normal text-muted-foreground">
            · {message.prospect.handle}
          </span>
        )}
        <ExternalLink className="size-3 text-muted-foreground transition-colors group-hover/link:text-primary" />
      </Link>

      {/* Subject (when present) */}
      {message.subject && (
        <p className="mt-3 text-sm font-medium">{message.subject}</p>
      )}

      {/* Content preview */}
      <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-sm text-foreground/80">
        {message.content}
      </p>

      <Separator className="my-3" />

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:text-destructive"
              aria-label="Delete message"
              disabled={isPending}
            >
              <Trash2 />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this message?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently removes the {MESSAGE_TYPE_LABELS[messageType].toLowerCase()} draft
                for {message.prospect.business_name}. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault()
                  handleDelete()
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Button type="button" variant="outline" size="xs" onClick={handleCopy}>
          {copied ? <Check /> : <Copy />}
          {copied ? "Copied" : "Copy"}
        </Button>

        {!optimisticSent && (
          <Button
            type="button"
            variant="default"
            size="xs"
            onClick={handleMarkSent}
            disabled={isPending}
          >
            <Send />
            Mark as sent
          </Button>
        )}
      </div>
    </li>
  )
}
