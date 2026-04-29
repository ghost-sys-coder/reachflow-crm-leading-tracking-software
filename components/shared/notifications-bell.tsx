"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Bell, CheckCheck, UserPlus, ArrowRightLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  getNotifications,
  getUnreadCount,
  markAllAsRead,
  markAsRead,
} from "@/app/actions/notifications"
import type { Notification } from "@/types/database"

function timeAgo(date: string | Date): string {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function NotificationIcon({ type }: { type: Notification["type"] }) {
  if (type === "prospect_assigned") return <UserPlus className="size-3.5 shrink-0 text-primary" />
  return <ArrowRightLeft className="size-3.5 shrink-0 text-muted-foreground" />
}

export function NotificationsBell() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [unread, setUnread] = useState(0)
  const [items, setItems] = useState<Notification[]>([])
  const [marking, setMarking] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  async function refreshCount() {
    const { data } = await getUnreadCount()
    if (data !== null) setUnread(data)
  }

  async function refreshList() {
    const { data } = await getNotifications()
    if (data) {
      setItems(data)
      setUnread(data.filter((n) => !n.read_at).length)
    }
  }

  useEffect(() => {
    refreshCount()
    intervalRef.current = setInterval(refreshCount, 30_000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  useEffect(() => {
    if (open) refreshList()
  }, [open])

  async function handleClick(n: Notification) {
    if (!n.read_at) {
      await markAsRead(n.id)
      setItems((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, read_at: new Date() } : x)),
      )
      setUnread((c) => Math.max(0, c - 1))
    }
    if (n.subject_id) {
      setOpen(false)
      router.push(`/prospects/${n.subject_id}`)
    }
  }

  async function handleMarkAll() {
    setMarking(true)
    await markAllAsRead()
    setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date() })))
    setUnread(0)
    setMarking(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="size-4" />
          {unread > 0 && (
            <span className="absolute right-1.5 top-1.5 flex size-2 items-center justify-center">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-primary" />
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-80 p-0"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="text-sm font-medium">
            Notifications
            {unread > 0 && (
              <span className="ml-2 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                {unread}
              </span>
            )}
          </span>
          {unread > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 text-xs"
              onClick={handleMarkAll}
              disabled={marking}
            >
              <CheckCheck className="size-3" />
              Mark all read
            </Button>
          )}
        </div>

        <ul className="max-h-80 overflow-y-auto">
          {items.length === 0 ? (
            <li className="px-4 py-8 text-center text-sm text-muted-foreground">
              No notifications yet
            </li>
          ) : (
            items.map((n) => (
              <li key={n.id}>
                <button
                  onClick={() => handleClick(n)}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent"
                >
                  <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-muted">
                    <NotificationIcon type={n.type} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm leading-snug">{n.message}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {timeAgo(n.created_at)}
                    </span>
                  </span>
                  {!n.read_at && (
                    <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                  )}
                </button>
              </li>
            ))
          )}
        </ul>
      </PopoverContent>
    </Popover>
  )
}
