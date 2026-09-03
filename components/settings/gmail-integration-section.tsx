"use client"

import * as React from "react"
import { CheckCircle2, ExternalLink, Mail, RefreshCw, Unplug } from "lucide-react"
import { toast } from "sonner"

import { disconnectGmail, renewGmailWatch, syncGmailNow, type GmailConnectionSummary } from "@/app/actions/gmail"
import { Button } from "@/components/ui/button"

export function GmailIntegrationSection({ connection, canConnect }: { connection: GmailConnectionSummary | null; canConnect: boolean }) {
  const [pending, startTransition] = React.useTransition()

  function disconnect() {
    startTransition(async () => {
      const result = await disconnectGmail()
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success("Gmail disconnected and stored authorization removed")
      window.location.reload()
    })
  }

  function synchronize() {
    startTransition(async () => {
      const result = await syncGmailNow()
      if (result.error || !result.data) {
        toast.error(result.error ?? "Gmail synchronization failed")
        return
      }
      toast.success(`Gmail synced: ${result.data.replies} new replies, ${result.data.imported} sent messages imported`)
      window.location.reload()
    })
  }

  function enableAutomaticSync() {
    startTransition(async () => {
      const result = await renewGmailWatch()
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success("Automatic Gmail synchronization enabled")
      window.location.reload()
    })
  }

  const canRead = connection?.granted_scopes.includes("https://www.googleapis.com/auth/gmail.readonly") ?? false

  return <div className="space-y-5">
    <div className="rounded-lg border bg-muted/30 p-4">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border bg-background"><Mail className="size-5" /></span>
          <div><p className="font-medium">Gmail</p><p className="mt-1 text-sm text-muted-foreground">Send reviewed outreach from your own Google mailbox and record delivery in ReachFlow.</p></div>
        </div>
        {connection ? <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700"><CheckCircle2 className="size-3.5" />Connected</span> : null}
      </div>
      {connection ? <div className="mt-4 flex flex-col justify-between gap-3 border-t pt-4 sm:flex-row sm:items-center"><div><p className="text-sm font-medium">{connection.email_address}</p><p className="text-xs text-muted-foreground">{connection.last_synced_at ? `Last synced ${new Date(connection.last_synced_at).toLocaleString()}` : connection.last_used_at ? `Last used ${new Date(connection.last_used_at).toLocaleString()}` : "Ready for your first send"}</p>{connection.last_error ? <p className="mt-1 text-xs text-destructive">{connection.last_error}</p> : null}</div><div className="flex flex-wrap gap-2">{canRead && <Button type="button" size="sm" variant="outline" disabled={pending} onClick={synchronize}><RefreshCw className={pending ? "animate-spin" : undefined} />Sync now</Button>}{canRead && connection.automatic_sync_available && <Button type="button" size="sm" variant="outline" disabled={pending} onClick={enableAutomaticSync}>Enable auto-sync</Button>}<Button asChild size="sm" variant={canRead ? "outline" : "default"}><a href="/api/integrations/gmail/authorize"><RefreshCw />{canRead ? "Reconnect" : "Reconnect for inbox access"}</a></Button><Button type="button" size="sm" variant="outline" disabled={pending} onClick={disconnect}><Unplug />{pending ? "Disconnecting…" : "Disconnect"}</Button></div></div> : <div className="mt-4 border-t pt-4">{canConnect ? <Button asChild size="sm"><a href="/api/integrations/gmail/authorize">Connect Gmail <ExternalLink /></a></Button> : <p className="text-sm text-muted-foreground">Viewer accounts cannot connect a sending mailbox.</p>}</div>}
    </div>
    <p className="text-xs leading-5 text-muted-foreground">ReachFlow requests permission to send email and read only the conversations needed to attach prospect email trails. Unrelated mailbox conversations are ignored. You can disconnect at any time.</p>
  </div>
}
