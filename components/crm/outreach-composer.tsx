"use client"

import * as React from "react"
import { toast } from "sonner"

import { recordCall, recordReply, recordSentOutreach } from "@/app/actions/messages"
import { sendGmailOutreach } from "@/app/actions/gmail"
import { sendWhatsAppOutreach } from "@/app/actions/whatsapp"
import { MESSAGE_TYPE_LABELS } from "@/components/crm/message-meta"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { CallOutcome, MessageType, ReplyIntent } from "@/db/schema"

const OUTREACH_TYPES: MessageType[] = ["instagram_dm", "cold_email", "whatsapp_message", "facebook_message", "linkedin_message", "x_message", "call_note", "custom"]
const CALL_OUTCOMES: CallOutcome[] = ["connected", "no_answer", "voicemail", "callback_requested", "wrong_number", "disqualified"]
const REPLY_INTENTS: ReplyIntent[] = ["interested", "not_now", "not_interested", "question", "wrong_contact", "disqualified"]

function defaultType(platform: string): MessageType {
  return ({ instagram: "instagram_dm", email: "cold_email", whatsapp: "whatsapp_message", facebook: "facebook_message", linkedin: "linkedin_message", x: "x_message", call: "call_note" } as Record<string, MessageType>)[platform] ?? "custom"
}

function humanize(value: string) {
  return value.replaceAll("_", " ").replace(/^./, (character) => character.toUpperCase())
}

export function OutreachComposer({ prospectId, platform }: { prospectId: string; platform: string }) {
  const [mode, setMode] = React.useState<"outreach" | "reply">("outreach")
  const [messageType, setMessageType] = React.useState<MessageType>(() => defaultType(platform))
  const [content, setContent] = React.useState("")
  const [subject, setSubject] = React.useState("")
  const [callOutcome, setCallOutcome] = React.useState<CallOutcome>("connected")
  const [durationMinutes, setDurationMinutes] = React.useState("")
  const [callbackAt, setCallbackAt] = React.useState("")
  const [nextAction, setNextAction] = React.useState("")
  const [replyIntent, setReplyIntent] = React.useState<ReplyIntent>("interested")
  const [objectionCode, setObjectionCode] = React.useState("")
  const [revisitAt, setRevisitAt] = React.useState("")
  const [isPending, startTransition] = React.useTransition()

  function submit() {
    if (!content.trim()) return
    startTransition(async () => {
      const result = mode === "reply"
        ? await recordReply({ prospect_id: prospectId, message_type: messageType, content, subject: undefined, reply_intent: replyIntent, objection_code: objectionCode || undefined, revisit_at: revisitAt ? new Date(revisitAt) : undefined })
        : messageType === "call_note"
          ? await recordCall({ prospect_id: prospectId, message_type: "call_note", content, subject: undefined, recorded_at: undefined, call_outcome: callOutcome, call_duration_seconds: durationMinutes ? Math.round(Number(durationMinutes) * 60) : undefined, callback_at: callbackAt ? new Date(callbackAt) : undefined, next_action: nextAction || undefined })
          : messageType === "whatsapp_message"
            ? await sendWhatsAppOutreach({ prospect_id: prospectId, content })
          : messageType === "cold_email"
            ? await sendGmailOutreach({ prospect_id: prospectId, subject, content })
            : await recordSentOutreach({ prospect_id: prospectId, message_type: messageType, content, subject: undefined })

      if (result.error) {
        toast.error(result.error)
        return
      }
      setContent("")
      setSubject("")
      setCallbackAt("")
      setRevisitAt("")
      toast.success(mode === "reply" ? "Reply recorded" : messageType === "call_note" ? "Call recorded" : messageType === "cold_email" ? "Email sent through Gmail" : messageType === "whatsapp_message" ? "WhatsApp message sent" : "Outreach recorded")
    })
  }

  const blocked = isPending || !content.trim()
    || (mode === "outreach" && messageType === "cold_email" && !subject.trim())
    || (mode === "outreach" && messageType === "call_note" && callOutcome === "callback_requested" && !callbackAt)
    || (mode === "reply" && replyIntent === "not_now" && !revisitAt)
    || (mode === "reply" && replyIntent === "disqualified" && !objectionCode.trim())

  return (
    <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
      <div className="flex gap-2">
        <Button type="button" size="xs" variant={mode === "outreach" ? "default" : "outline"} onClick={() => setMode("outreach")}>Record outreach</Button>
        <Button type="button" size="xs" variant={mode === "reply" ? "default" : "outline"} onClick={() => setMode("reply")}>Record reply</Button>
      </div>
      <div className="grid gap-3">
        <div className="grid gap-1.5"><Label>Channel</Label><Select value={messageType} onValueChange={(value) => setMessageType(value as MessageType)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{OUTREACH_TYPES.map((type) => <SelectItem key={type} value={type}>{MESSAGE_TYPE_LABELS[type]}</SelectItem>)}</SelectContent></Select></div>
        <div className="grid gap-1.5"><Label htmlFor="outreach-content">{mode === "reply" ? "Prospect's message" : messageType === "call_note" ? "Call notes" : "Message sent"}</Label><Textarea id="outreach-content" rows={3} value={content} onChange={(event) => setContent(event.target.value)} placeholder="Record what was sent or discussed..." /></div>
      </div>
      {mode === "outreach" && messageType === "cold_email" && <div className="grid gap-1.5"><Label htmlFor="outreach-subject">Subject</Label><Input id="outreach-subject" value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={200} placeholder="A concise, relevant subject" /></div>}

      {mode === "outreach" && messageType === "call_note" && <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5"><Label>Outcome</Label><Select value={callOutcome} onValueChange={(value) => setCallOutcome(value as CallOutcome)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CALL_OUTCOMES.map((value) => <SelectItem key={value} value={value}>{humanize(value)}</SelectItem>)}</SelectContent></Select></div>
        <div className="grid gap-1.5"><Label htmlFor="call-duration">Duration (minutes)</Label><Input id="call-duration" type="number" min="0" max="1440" step="1" value={durationMinutes} onChange={(event) => setDurationMinutes(event.target.value)} /></div>
        {callOutcome === "callback_requested" && <div className="grid gap-1.5"><Label htmlFor="callback-at">Callback date</Label><Input id="callback-at" type="datetime-local" value={callbackAt} onChange={(event) => setCallbackAt(event.target.value)} /></div>}
        <div className="grid gap-1.5"><Label htmlFor="next-action">Next action</Label><Input id="next-action" value={nextAction} onChange={(event) => setNextAction(event.target.value)} placeholder="Send proposal, confirm decision maker..." /></div>
      </div>}

      {mode === "reply" && <div className="grid gap-3">
        <div className="grid gap-1.5"><Label>Reply intent</Label><Select value={replyIntent} onValueChange={(value) => setReplyIntent(value as ReplyIntent)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{REPLY_INTENTS.map((value) => <SelectItem key={value} value={value}>{humanize(value)}</SelectItem>)}</SelectContent></Select></div>
        <div className="grid gap-1.5"><Label htmlFor="objection-code">Objection or reason</Label><Input id="objection-code" value={objectionCode} onChange={(event) => setObjectionCode(event.target.value)} placeholder="Price, timing, authority..." /></div>
        {replyIntent === "not_now" && <div className="grid gap-1.5"><Label htmlFor="revisit-at">Revisit date</Label><Input id="revisit-at" type="datetime-local" value={revisitAt} onChange={(event) => setRevisitAt(event.target.value)} /></div>}
      </div>}

      <div className="flex justify-end"><Button type="button" size="sm" disabled={blocked} onClick={submit}>{isPending ? (messageType === "cold_email" ? "Sending..." : "Recording...") : mode === "reply" ? "Record reply" : messageType === "cold_email" ? "Send with Gmail" : "Record outreach"}</Button></div>
    </div>
  )
}
