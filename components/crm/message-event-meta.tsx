import { Badge } from "@/components/ui/badge"
import type { Message } from "@/types/database"

function label(value: string) {
  return value.replaceAll("_", " ").replace(/^./, (character) => character.toUpperCase())
}

export function MessageEventMeta({ message }: { message: Message }) {
  const duration = message.call_duration_seconds
    ? `${Math.floor(message.call_duration_seconds / 60)}m ${message.call_duration_seconds % 60}s`
    : null

  return (
    <div className="flex flex-wrap gap-1.5">
      {message.direction === "inbound" && <Badge variant="outline">Inbound</Badge>}
      {message.direction === "outbound" && message.provider === "gmail" && <Badge variant="outline">Sent with Gmail</Badge>}
      {message.direction === "inbound" && !message.is_read && <Badge variant="secondary">Unread</Badge>}
      {message.call_outcome && <Badge variant="secondary">{label(message.call_outcome)}</Badge>}
      {duration && <Badge variant="outline">{duration}</Badge>}
      {message.reply_intent && <Badge variant="secondary">{label(message.reply_intent)}</Badge>}
      {message.objection_code && <Badge variant="outline">Reason: {message.objection_code}</Badge>}
      {message.callback_at && <Badge variant="outline">Callback {new Date(message.callback_at).toLocaleString()}</Badge>}
      {message.next_action && <Badge variant="outline">Next: {message.next_action}</Badge>}
    </div>
  )
}
