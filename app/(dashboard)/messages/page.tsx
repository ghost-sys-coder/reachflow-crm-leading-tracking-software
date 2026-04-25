import {
  MessageCircle,
  MessagesSquare,
  Send,
  Sparkles,
  TrendingUp,
} from "lucide-react"

import { EmptyState } from "@/components/crm/empty-state"
import {
  MessageFilterBar,
  type MessageFilterCounts,
  type MessageState,
} from "@/components/crm/message-filter-bar"
import { MessagesList } from "@/components/crm/messages-list"
import { Card, CardContent } from "@/components/ui/card"
import { getAllMessages } from "@/app/actions/messages"
import { MESSAGE_TYPES } from "@/lib/validation/schemas"
import type { MessageType } from "@/db/schema"
import type { MessageWithProspect } from "@/types/database"

type MessagesSearchParams = {
  type?: string
  state?: string
  q?: string
}

const STATE_VALUES = ["sent", "draft"] as const

function parseType(value: string | undefined): MessageType | null {
  return value && (MESSAGE_TYPES as readonly string[]).includes(value)
    ? (value as MessageType)
    : null
}

function parseState(value: string | undefined): MessageState | null {
  return value && (STATE_VALUES as readonly string[]).includes(value)
    ? (value as MessageState)
    : null
}

function computeStats(all: MessageWithProspect[]) {
  const total = all.length
  const sent = all.filter((m) => m.was_sent).length
  const drafts = total - sent
  const sentRate = total === 0 ? 0 : sent / total
  return { total, sent, drafts, sentRate }
}

function computeCounts(all: MessageWithProspect[]): MessageFilterCounts {
  const type = Object.fromEntries(
    MESSAGE_TYPES.map((t) => [t, 0]),
  ) as Record<MessageType, number>
  let sent = 0
  for (const m of all) {
    if (m.message_type in type) type[m.message_type as MessageType] += 1
    if (m.was_sent) sent += 1
  }
  return {
    all: all.length,
    type,
    state: { sent, draft: all.length - sent },
  }
}

function filterMessages(
  all: MessageWithProspect[],
  filters: {
    type: MessageType | null
    state: MessageState | null
    search: string
  },
): MessageWithProspect[] {
  const term = filters.search.trim().toLowerCase()
  return all.filter((m) => {
    if (filters.type && m.message_type !== filters.type) return false
    if (filters.state === "sent" && !m.was_sent) return false
    if (filters.state === "draft" && m.was_sent) return false
    if (term) {
      const hay = [
        m.content,
        m.subject,
        m.prospect.business_name,
        m.prospect.handle,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      if (!hay.includes(term)) return false
    }
    return true
  })
}

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<MessagesSearchParams>
}) {
  const params = await searchParams
  const type = parseType(params.type)
  const state = parseState(params.state)
  const search = params.q ?? ""

  const result = await getAllMessages()
  const all = result.data ?? []
  const stats = computeStats(all)
  const counts = computeCounts(all)
  const filtered = filterMessages(all, { type, state, search })

  const hasAnyMessages = all.length > 0
  const hasFilters = Boolean(type || state || search)

  const statCards = [
    {
      label: "Total messages",
      value: String(stats.total),
      icon: MessagesSquare,
    },
    { label: "Sent", value: String(stats.sent), icon: Send },
    { label: "Drafts", value: String(stats.drafts), icon: MessageCircle },
    {
      label: "Sent rate",
      value: stats.total === 0 ? "—" : `${Math.round(stats.sentRate * 100)}%`,
      icon: TrendingUp,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Messages</h2>
          <p className="text-sm text-muted-foreground">
            Every draft and sent outreach across your prospects.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((s) => (
          <Card key={s.label} size="sm">
            <CardContent className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="pt-1 text-2xl font-semibold tracking-tight">
                  {s.value}
                </p>
              </div>
              <span className="inline-flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                <s.icon className="size-4" />
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      {hasAnyMessages ? (
        <>
          <MessageFilterBar
            counts={counts}
            initialSearch={search}
            activeType={type}
            activeState={state}
          />

          {filtered.length === 0 ? (
            <EmptyState
              title="No messages match these filters"
              description="Try clearing the filters or widening your search."
            />
          ) : (
            <MessagesList messages={filtered} />
          )}

          <p className="text-center text-xs text-muted-foreground">
            Showing {filtered.length} of {all.length} messages
            {hasFilters ? " (filtered)" : ""}.
          </p>
        </>
      ) : (
        <EmptyState
          icon={Sparkles}
          title="No messages yet"
          description="Open a prospect from the pipeline to draft outreach. The AI generator arrives in Phase 5."
        />
      )}
    </div>
  )
}
