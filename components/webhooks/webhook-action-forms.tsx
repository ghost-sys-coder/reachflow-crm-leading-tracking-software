"use client"

import { useActionState, useEffect } from "react"
import { AlertTriangle, LoaderCircle, Trash2 } from "lucide-react"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  createWebhookEndpoint,
  deleteWebhookEndpoint,
  retryWebhook,
  rotateWebhookSecret,
  sendTestWebhook,
  toggleWebhookEndpoint,
  updateWebhookSubscriptions,
  type WebhookActionState,
} from "@/app/actions/webhooks"
import { WEBHOOK_EVENT_TYPES } from "@/lib/webhooks/events"

const initialState: WebhookActionState = { success: false, message: "" }

function Feedback({ state }: { state: WebhookActionState }) {
  useEffect(() => {
    if (!state.message) return
    ;(state.success ? toast.success : toast.error)(state.message)
  }, [state])

  return state.message ? (
    <p role="status" className={`text-xs ${state.success ? "text-emerald-600" : "text-destructive"}`}>{state.message}</p>
  ) : null
}

const eventLabels: Record<string, string> = {
  "prospect.created": "Prospect created",
  "prospect.status_changed": "Status changed",
  "reply.recorded": "Reply recorded",
  "meeting.booked": "Meeting booked",
  "deal.won": "Deal won",
  "task.completed": "Task completed",
}

function EventChecks({ selected = [] }: { selected?: string[] }) {
  return (
    <div className="flex flex-wrap gap-3">
      {WEBHOOK_EVENT_TYPES.map(event => (
        <label key={event} className="flex items-center gap-1.5 text-xs">
          <input type="checkbox" name="events" value={event} defaultChecked={selected.includes(event)} />
          {eventLabels[event]}
        </label>
      ))}
    </div>
  )
}

export function CreateEndpointForm() {
  const [state, action, pending] = useActionState(createWebhookEndpoint, initialState)
  return <form action={action} className="space-y-3"><div className="flex flex-col gap-3 sm:flex-row"><Input name="name" placeholder="Zapier production" required disabled={pending} /><Input name="url" type="url" placeholder="https://hooks.zapier.com/hooks/catch/..." required disabled={pending} /><Button disabled={pending}>{pending ? <><LoaderCircle className="animate-spin" />Creating...</> : "Create endpoint"}</Button></div><EventChecks /><Feedback state={state} /></form>
}

export function TestEndpointForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState(sendTestWebhook, initialState)
  return <form action={action} className="space-y-1"><input type="hidden" name="endpoint_id" value={id} /><Button size="sm" variant="outline" disabled={pending}>{pending ? <><LoaderCircle className="animate-spin" />Sending...</> : "Send test"}</Button><Feedback state={state} /></form>
}

export function ToggleEndpointForm({ id, active }: { id: string; active: boolean }) {
  const [state, action, pending] = useActionState(toggleWebhookEndpoint, initialState)
  return <form action={action} className="space-y-1"><input type="hidden" name="id" value={id} /><input type="hidden" name="active" value={String(!active)} /><Button size="sm" disabled={pending}>{pending ? <><LoaderCircle className="animate-spin" />Saving...</> : active ? "Disable" : "Enable"}</Button><Feedback state={state} /></form>
}

export function RetryDeliveryForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState(retryWebhook, initialState)
  return <form action={action} className="space-y-1"><input type="hidden" name="delivery_id" value={id} /><Button size="sm" variant="outline" disabled={pending}>{pending ? <><LoaderCircle className="animate-spin" />Retrying...</> : "Retry"}</Button><Feedback state={state} /></form>
}

export function SubscriptionForm({ id, selected }: { id: string; selected: string[] }) {
  const [state, action, pending] = useActionState(updateWebhookSubscriptions, initialState)
  return <form action={action} className="space-y-2"><input type="hidden" name="id" value={id} /><EventChecks selected={selected} /><Button size="sm" variant="outline" disabled={pending}>{pending ? <><LoaderCircle className="animate-spin" />Saving...</> : "Save events"}</Button><Feedback state={state} /></form>
}

export function RotateSecretForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState(rotateWebhookSecret, initialState)
  return <form action={action} className="space-y-1"><input type="hidden" name="id" value={id} /><Button size="sm" variant="outline" disabled={pending}>{pending ? <><LoaderCircle className="animate-spin" />Rotating...</> : "Rotate secret"}</Button><Feedback state={state} /></form>
}

export function DeleteEndpointForm({ id, name }: { id: string; name: string }) {
  const [state, action, pending] = useActionState(deleteWebhookEndpoint, initialState)

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" size="sm" variant="destructive" aria-label={`Delete ${name} webhook endpoint`}>
          <Trash2 />
          Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <form action={action} className="contents">
          <input type="hidden" name="id" value={id} />
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive">
              <AlertTriangle />
            </AlertDialogMedia>
            <AlertDialogTitle>Delete this webhook endpoint?</AlertDialogTitle>
            <AlertDialogDescription>
              ReachFlow will immediately stop sending events to <span className="font-medium text-foreground">{name}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm">
            <p className="font-medium text-foreground">This action cannot be undone.</p>
            <p className="mt-1 text-muted-foreground">The endpoint, its delivery records, and delivery attempts will be permanently removed. Your Zap itself will not be deleted.</p>
          </div>

          <Feedback state={state} />

          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Keep endpoint</AlertDialogCancel>
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending ? <><LoaderCircle className="animate-spin" />Deleting endpoint...</> : <><Trash2 />Delete permanently</>}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  )
}
