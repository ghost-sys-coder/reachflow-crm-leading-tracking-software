"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  AlertTriangle,
  Check,
  Copy,
  Loader2,
  RefreshCcw,
  Send,
  Sparkles,
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
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  MESSAGE_TYPE_ICONS,
  MESSAGE_TYPE_LABELS,
} from "@/components/crm/message-meta"
import { deleteMessage, markMessageAsSent } from "@/app/actions/messages"
import { cn } from "@/lib/utils"
import type { MessageType } from "@/db/schema"
import type { Message } from "@/types/database"

type GenerateResponse = {
  message: Message
  usage: { input_tokens: number; output_tokens: number }
}

const MESSAGE_TYPES: MessageType[] = [
  "instagram_dm",
  "cold_email",
  "follow_up",
  "custom",
]

function formatDateTime(value: string | Date | null): string {
  if (!value) return ""
  const date = typeof value === "string" ? new Date(value) : value
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

//keyed inner component resets the rAF loop on text change without a sync setState
function TypewriterText({
  text,
  charsPerFrame,
  className,
}: {
  text: string
  charsPerFrame: number
  className?: string
}) {
  const [displayed, setDisplayed] = React.useState("")
  const done = displayed.length >= text.length

  React.useEffect(() => {
    let i = 0
    let frame = 0
    function tick() {
      i = Math.min(text.length, i + charsPerFrame)
      setDisplayed(text.slice(0, i))
      if (i < text.length) {
        frame = requestAnimationFrame(tick)
      }
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [text, charsPerFrame])

  return (
    <pre
      className={cn(
        "whitespace-pre-wrap break-words font-sans text-sm text-foreground",
        !done && "after:inline-block after:h-4 after:w-[2px] after:animate-pulse after:bg-primary after:align-middle after:ml-px",
        className,
      )}
    >
      {displayed}
    </pre>
  )
}

export function GeneratorPanel({
  prospectId,
  messages,
  agencyReady,
}: {
  prospectId: string
  messages: Message[]
  agencyReady: boolean
}) {
  const router = useRouter()
  const [messageType, setMessageType] = React.useState<MessageType>("instagram_dm")
  const [customInstructions, setCustomInstructions] = React.useState("")
  const [isGenerating, setIsGenerating] = React.useState(false)
  const [current, setCurrent] = React.useState<GenerateResponse | null>(null)
  const [profileModalOpen, setProfileModalOpen] = React.useState(false)

  const outputText = current
    ? current.message.subject
      ? `${current.message.subject}\n\n${current.message.content}`
      : current.message.content
    : ""

  const hasPreviousMessages = messages.length > 0

  async function runGeneration() {
    if (!agencyReady) {
      setProfileModalOpen(true)
      return
    }
    if (messageType === "custom" && !customInstructions.trim()) {
      toast.error("Describe what you want in the custom instructions.")
      return
    }
    if (messageType === "follow_up" && !hasPreviousMessages) {
      toast.error("Generate a first message before following up.")
      return
    }

    setIsGenerating(true)
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prospectId,
          messageType,
          customInstructions: customInstructions.trim() || undefined,
        }),
      })

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string
        code?: string
        message?: Message
        usage?: { input_tokens: number; output_tokens: number }
      }

      if (!response.ok || !payload.message || !payload.usage) {
        if (payload.code === "agency_incomplete") {
          setProfileModalOpen(true)
        } else {
          toast.error(payload.error ?? "Generation failed.")
        }
        return
      }

      setCurrent({ message: payload.message, usage: payload.usage })
      toast.success("Message generated")
      router.refresh()
    } catch {
      toast.error("Network error. Please try again.")
    } finally {
      setIsGenerating(false)
    }
  }

  function handleCopy() {
    if (!current) return
    const text = current.message.subject
      ? `${current.message.subject}\n\n${current.message.content}`
      : current.message.content
    navigator.clipboard
      .writeText(text)
      .then(() => toast.success("Copied to clipboard"))
      .catch(() => toast.error("Could not copy"))
  }

  async function handleMarkSent() {
    if (!current) return
    const result = await markMessageAsSent(current.message.id)
    if (result.error !== null) {
      toast.error(result.error)
      return
    }
    setCurrent((prev) =>
      prev ? { ...prev, message: { ...prev.message, was_sent: true } } : prev,
    )
    toast.success("Marked as sent")
    router.refresh()
  }

  return (
    <div className="space-y-5">
      {/* Incomplete-profile modal */}
      <AlertDialog open={profileModalOpen} onOpenChange={setProfileModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-warning" />
              Set up your agency profile first
            </AlertDialogTitle>
            <AlertDialogDescription>
              The AI needs your agency name and value props to write a
              message that feels personal instead of generic. Set that up in
              settings, then come back here.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Link href="/settings/agency">Go to settings</Link>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Type selector */}
      <div className="space-y-2">
        <Label className="text-[11px] tracking-wider text-muted-foreground uppercase">
          Message type
        </Label>
        <div
          role="radiogroup"
          aria-label="Message type"
          className="grid grid-cols-2 gap-1.5 sm:grid-cols-4"
        >
          {MESSAGE_TYPES.map((t) => {
            const Icon = MESSAGE_TYPE_ICONS[t]
            const isActive = messageType === t
            return (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={isActive}
                onClick={() => setMessageType(t)}
                className={cn(
                  "inline-flex items-center justify-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-medium transition-colors",
                  "focus-visible:outline-hidden focus-visible:ring-3 focus-visible:ring-ring/50",
                  isActive
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="size-3.5" />
                {MESSAGE_TYPE_LABELS[t]}
              </button>
            )
          })}
        </div>
      </div>

      {/* Custom instructions */}
      {messageType === "custom" && (
        <div className="space-y-2">
          <Label
            htmlFor="custom_instructions"
            className="text-[11px] tracking-wider text-muted-foreground uppercase"
          >
            Instructions
          </Label>
          <Textarea
            id="custom_instructions"
            rows={3}
            placeholder="e.g. Short, warm, mention their recent rebrand. Under 80 words."
            value={customInstructions}
            onChange={(e) => setCustomInstructions(e.target.value)}
            maxLength={2000}
          />
        </div>
      )}

      {/* Generate button */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] text-muted-foreground">
          {messageType === "follow_up" && !hasPreviousMessages
            ? "Follow-ups need a previous message first."
            : "Generates plain text. Save or copy after reviewing."}
        </p>
        <Button
          type="button"
          size="sm"
          onClick={runGeneration}
          disabled={
            isGenerating ||
            (messageType === "follow_up" && !hasPreviousMessages)
          }
        >
          {isGenerating ? (
            <>
              <Loader2 className="animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles />
              {current ? "Regenerate" : "Generate message"}
            </>
          )}
        </Button>
      </div>

      {/* Output */}
      {current && (
        <div className="rounded-xl border border-border bg-card p-4 ring-1 ring-foreground/10">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
            <span className="uppercase tracking-wider">
              {MESSAGE_TYPE_LABELS[current.message.message_type as MessageType]}
            </span>
            <span>
              {current.usage.input_tokens} in · {current.usage.output_tokens} out
            </span>
          </div>

          <div className="mt-3 max-h-[400px] overflow-y-auto">
            <TypewriterText
              key={current.message.id}
              text={outputText}
              charsPerFrame={8}
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
            <Button type="button" variant="outline" size="xs" onClick={handleCopy}>
              <Copy />
              Copy
            </Button>
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={runGeneration}
              disabled={isGenerating}
            >
              <RefreshCcw className={cn(isGenerating && "animate-spin")} />
              Regenerate
            </Button>
            {!current.message.was_sent && (
              <Button
                type="button"
                variant="default"
                size="xs"
                onClick={handleMarkSent}
              >
                <Send />
                Mark as sent
              </Button>
            )}
            {current.message.was_sent && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                <Check className="size-3" />
                Sent
              </span>
            )}
          </div>
        </div>
      )}

      {/* Message history */}
      {hasPreviousMessages && (
        <div className="space-y-2">
          <p className="text-[11px] tracking-wider text-muted-foreground uppercase">
            History
          </p>
          <ul className="space-y-2">
            {messages
              .filter((m) => m.id !== current?.message.id)
              .map((m) => (
                <HistoryEntry
                  key={m.id}
                  message={m}
                  onChanged={() => router.refresh()}
                />
              ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function HistoryEntry({
  message,
  onChanged,
}: {
  message: Message
  onChanged: () => void
}) {
  const [expanded, setExpanded] = React.useState(false)
  const [optimisticSent, setOptimisticSent] = React.useState(message.was_sent)
  const [removed, setRemoved] = React.useState(false)
  const [isPending, startTransition] = React.useTransition()

  const messageType = message.message_type as MessageType
  const TypeIcon = MESSAGE_TYPE_ICONS[messageType]

  async function handleCopy() {
    const text = message.subject
      ? `${message.subject}\n\n${message.content}`
      : message.content
    try {
      await navigator.clipboard.writeText(text)
      toast.success("Copied to clipboard")
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
      onChanged()
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
      onChanged()
    })
  }

  if (removed) return null

  const preview = message.content.slice(0, 80) + (message.content.length > 80 ? "..." : "")

  return (
    <li className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-start justify-between gap-3 text-left"
        aria-expanded={expanded}
      >
        <span className="flex flex-1 items-start gap-2">
          <TypeIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 space-y-1">
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {MESSAGE_TYPE_LABELS[messageType]}
              </span>
              {optimisticSent && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                  <Check className="size-2.5" />
                  Sent
                </span>
              )}
              <span className="text-[11px] text-muted-foreground">
                {formatDateTime(message.sent_at ?? message.created_at)}
              </span>
            </span>
            {message.subject && !expanded && (
              <span className="block text-xs font-medium">{message.subject}</span>
            )}
            {!expanded && (
              <span className="block text-xs text-muted-foreground">{preview}</span>
            )}
          </span>
        </span>
      </button>

      {expanded && (
        <div className="mt-3 space-y-3">
          {message.subject && (
            <p className="text-sm font-medium">{message.subject}</p>
          )}
          <p className="whitespace-pre-wrap text-sm text-foreground/90">
            {message.content}
          </p>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="text-muted-foreground hover:text-destructive"
              onClick={handleDelete}
              disabled={isPending}
              aria-label="Delete message"
            >
              <Trash2 />
            </Button>
            <Button type="button" variant="outline" size="xs" onClick={handleCopy}>
              <Copy />
              Copy
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
        </div>
      )}
    </li>
  )
}
