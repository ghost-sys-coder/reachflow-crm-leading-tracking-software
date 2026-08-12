"use client"

import * as React from "react"
import { toast } from "sonner"

import { recordSentOutreach } from "@/app/actions/messages"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { MESSAGE_TYPE_LABELS } from "@/components/crm/message-meta"
import type { MessageType } from "@/db/schema"

const OUTREACH_TYPES: MessageType[] = [
  "instagram_dm", "cold_email", "facebook_message", "linkedin_message",
  "x_message", "call_note", "custom",
]

function defaultType(platform: string): MessageType {
  return ({ instagram: "instagram_dm", email: "cold_email", facebook: "facebook_message", linkedin: "linkedin_message", x: "x_message", call: "call_note" } as Record<string, MessageType>)[platform] ?? "custom"
}

export function OutreachComposer({ prospectId, platform }: { prospectId: string; platform: string }) {
  const [messageType, setMessageType] = React.useState<MessageType>(() => defaultType(platform))
  const [content, setContent] = React.useState("")
  const [isPending, startTransition] = React.useTransition()

  function submit() {
    if (!content.trim()) return
    startTransition(async () => {
      const result = await recordSentOutreach({ prospect_id: prospectId, message_type: messageType, content, subject: undefined })
      if (result.error) {
        toast.error(result.error)
        return
      }
      setContent("")
      toast.success(messageType === "call_note" ? "Call recorded" : "Outreach recorded")
    })
  }

  return (
    <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
      <div className="grid gap-3 sm:grid-cols-[11rem_1fr]">
        <div className="grid gap-1.5">
          <Label>Channel</Label>
          <Select value={messageType} onValueChange={(value) => setMessageType(value as MessageType)}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>{OUTREACH_TYPES.map((type) => <SelectItem key={type} value={type}>{MESSAGE_TYPE_LABELS[type]}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="outreach-content">{messageType === "call_note" ? "Call notes" : "Message sent"}</Label>
          <Textarea id="outreach-content" rows={3} value={content} onChange={(event) => setContent(event.target.value)} placeholder="Record what was sent or discussed…" />
        </div>
      </div>
      <div className="flex justify-end"><Button type="button" size="sm" disabled={isPending || !content.trim()} onClick={submit}>{isPending ? "Recording…" : "Record outreach"}</Button></div>
    </div>
  )
}
