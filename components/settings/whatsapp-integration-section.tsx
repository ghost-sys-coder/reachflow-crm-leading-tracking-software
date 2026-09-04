"use client"

import * as React from "react"
import { CheckCircle2, MessageCircle, Plug, Unplug } from "lucide-react"
import { toast } from "sonner"

import { connectConfiguredWhatsApp, disconnectWhatsApp, type WhatsAppConnectionSummary } from "@/app/actions/whatsapp"
import { Button } from "@/components/ui/button"

export function WhatsAppIntegrationSection({ connection, canConnect }: { connection: WhatsAppConnectionSummary | null; canConnect: boolean }) {
  const [pending, startTransition] = React.useTransition()

  function connect() {
    startTransition(async () => {
      const result = await connectConfiguredWhatsApp()
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success("WhatsApp connected and webhook subscription enabled")
    })
  }

  function disconnect() {
    startTransition(async () => {
      const result = await disconnectWhatsApp()
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success("WhatsApp disconnected from this workspace")
    })
  }

  return (
    <section className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15"><MessageCircle className="size-5" /></span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2"><h3 className="font-medium">WhatsApp Business</h3>{connection && <span className="inline-flex items-center gap-1 text-xs text-primary"><CheckCircle2 className="size-3.5" />Connected</span>}</div>
          <p className="mt-1 text-sm text-muted-foreground">Send WhatsApp outreach and attach incoming conversations to prospects by phone number.</p>
        </div>
      </div>
      <div className="mt-4 flex flex-col justify-between gap-3 border-t pt-4 sm:flex-row sm:items-center">
        <div><p className="text-sm font-medium">{connection?.display_phone_number ?? (connection ? "Configured business number" : "No business number connected")}</p><p className="text-xs text-muted-foreground">{connection?.last_message_at ? `Last message ${new Date(connection.last_message_at).toLocaleString()}` : connection ? "Ready to send and receive messages" : "Uses the Meta credentials configured for this deployment"}</p>{connection?.last_error && <p className="mt-1 text-xs text-destructive">{connection.last_error}</p>}</div>
        {canConnect ? connection ? <Button type="button" variant="outline" disabled={pending} onClick={disconnect}><Unplug />{pending ? "Disconnecting…" : "Disconnect"}</Button> : <Button type="button" disabled={pending} onClick={connect}><Plug />{pending ? "Connecting…" : "Connect WhatsApp"}</Button> : <p className="text-sm text-muted-foreground">Only workspace admins can manage this connection.</p>}
      </div>
    </section>
  )
}
