"use client"

import * as React from "react"
import { CheckCircle2, Clock3, MessageCircle, RefreshCw, ShieldCheck, Unplug } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { disconnectWhatsApp, type WhatsAppConnectionSummary, type WhatsAppSignupOptions } from "@/app/actions/whatsapp"
import { Button } from "@/components/ui/button"

type SignupDiagnosticPhase = "login_started" | "session_event" | "callback_finished" | "failed"

function parseMetaSignupPayload(event: MessageEvent) {
  try {
    const origin = new URL(event.origin)
    if (origin.protocol !== "https:" || (origin.hostname !== "facebook.com" && !origin.hostname.endsWith(".facebook.com"))) return null
  } catch {
    return null
  }
  if (typeof event.data !== "string") return event.data
  try { return JSON.parse(event.data) } catch { return null }
}

function reportSignupDiagnostic(phase: SignupDiagnosticPhase, attemptId: string, detail?: string) {
  void fetch("/api/integrations/whatsapp/diagnostics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phase, attemptId, detail }),
    keepalive: true,
  }).catch(() => undefined)
}

export function WhatsAppIntegrationSection({ connection, signupOptions, configurationError, canConnect }: { connection: WhatsAppConnectionSummary | null; signupOptions: WhatsAppSignupOptions | null; configurationError?: string | null; canConnect: boolean }) {
  const router = useRouter()
  const [pending, startTransition] = React.useTransition()
  const [signupInProgress, setSignupInProgress] = React.useState(false)
  const [signupError, setSignupError] = React.useState<string | null>(configurationError ?? null)

  function connect() {
    if (window.location.protocol !== "https:") {
      const message = "Meta requires HTTPS. Restart locally with `npm run dev:https`, or connect from crm.veilcode.studio."
      setSignupError(message)
      toast.error(message, { duration: 7000 })
      return
    }
    if (!signupOptions) {
      const message = signupError ?? "WhatsApp Embedded Signup is not configured."
      setSignupError(message)
      toast.error(message)
      return
    }
    setSignupError(null)
    setSignupInProgress(true)
    const attemptId = crypto.randomUUID()
    try {
        const signup = signupOptions
        const timers: { completion?: number } = {}
        const channel = "BroadcastChannel" in window ? new BroadcastChannel("reachflow-whatsapp-oauth") : null
        const stopListening = () => {
          window.removeEventListener("message", onMessage)
          channel?.removeEventListener("message", onBroadcast)
          channel?.close()
          if (timers.completion !== undefined) window.clearTimeout(timers.completion)
        }
        const failSignup = (message: string) => {
          stopListening()
          reportSignupDiagnostic("failed", attemptId, message)
          setSignupInProgress(false)
          setSignupError(message)
          toast.error(message)
        }
        const finishSignup = (payload: unknown) => {
          if (!payload || typeof payload !== "object" || !("type" in payload) || payload.type !== "REACHFLOW_WHATSAPP_OAUTH") return
          const result = payload as { success?: boolean; error?: string }
          if (!result.success) {
            failSignup(result.error ?? "Meta could not complete the WhatsApp connection.")
            return
          }
          stopListening()
          reportSignupDiagnostic("callback_finished", attemptId, "connection_saved")
          setSignupInProgress(false)
          setSignupError(null)
          toast.success("Your WhatsApp business number is connected")
          router.refresh()
        }
        const onMessage = (event: MessageEvent) => {
          if (event.origin === window.location.origin && event.data?.type === "REACHFLOW_WHATSAPP_OAUTH") {
            finishSignup(event.data)
            return
          }
          const payload = parseMetaSignupPayload(event)
          if (payload?.type === "WA_EMBEDDED_SIGNUP") {
            reportSignupDiagnostic("session_event", attemptId, String(payload.event ?? "unknown"))
          }
          if (payload?.type === "WA_EMBEDDED_SIGNUP" && payload.event === "CANCEL") {
            failSignup("WhatsApp signup was cancelled")
            return
          }
          if (payload?.type === "WA_EMBEDDED_SIGNUP" && payload.event === "ERROR") {
            failSignup(payload.data?.error_message ?? "Meta could not complete WhatsApp signup")
            return
          }
        }
        const onBroadcast = (event: MessageEvent) => finishSignup(event.data)
        window.addEventListener("message", onMessage)
        channel?.addEventListener("message", onBroadcast)
        timers.completion = window.setTimeout(() => {
          failSignup("Meta did not return to ReachFlow. Confirm the exact OAuth redirect URI in Meta and try again.")
        }, 10 * 60_000)
        const oauthUrl = new URL(`https://www.facebook.com/${signup.graphApiVersion}/dialog/oauth`)
        oauthUrl.search = new URLSearchParams({
          client_id: signup.appId,
          redirect_uri: signup.redirectUri,
          response_type: "code",
          config_id: signup.configurationId,
          state: signup.state,
          auth_type: "rerequest",
          override_default_response_type: "true",
          extras: JSON.stringify({ setup: {} }),
          display: "popup",
        }).toString()
        const width = 640
        const height = 720
        const left = Math.max(0, window.screenX + (window.outerWidth - width) / 2)
        const top = Math.max(0, window.screenY + (window.outerHeight - height) / 2)
        const popup = window.open(oauthUrl.toString(), "reachflow-whatsapp-signup", `popup=yes,width=${width},height=${height},left=${left},top=${top}`)
        if (!popup) {
          failSignup("Your browser blocked the Meta window. Allow popups for this site and try again.")
          return
        }
        reportSignupDiagnostic("login_started", attemptId)
      } catch (cause) {
        setSignupInProgress(false)
        const message = cause instanceof Error ? cause.message : "Could not start WhatsApp signup"
        reportSignupDiagnostic("failed", attemptId, message)
        setSignupError(message)
        toast.error(message)
      }
  }

  function disconnect() {
    startTransition(async () => {
      const result = await disconnectWhatsApp()
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success("WhatsApp disconnected from this workspace")
      router.refresh()
    })
  }

  const expiresAt = connection?.token_expires_at ? new Date(connection.token_expires_at) : null
  const isLegacy = connection?.connection_method === "environment"

  return (
    <section className="rounded-xl border border-border/70 bg-card p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20"><MessageCircle className="size-5" /></span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2"><h3 className="font-medium">WhatsApp Business</h3>{connection?.status === "active" && <span className="inline-flex items-center gap-1 text-xs text-emerald-600"><CheckCircle2 className="size-3.5" />Connected</span>}</div>
          <p className="mt-1 text-sm text-muted-foreground">Connect a workspace-owned business number, send outreach and attach replies to prospects automatically.</p>
        </div>
      </div>
      {connection && <div className="mt-4 grid gap-3 rounded-lg border bg-muted/30 p-3 text-sm sm:grid-cols-2">
        <div><p className="text-xs text-muted-foreground">Business number</p><p className="font-medium">{connection.display_phone_number ?? "Configured number"}</p>{connection.verified_name && <p className="text-xs text-muted-foreground">{connection.verified_name}</p>}</div>
        <div><p className="text-xs text-muted-foreground">Authorization</p><p className="flex items-center gap-1.5 font-medium">{isLegacy ? <RefreshCw className="size-3.5" /> : <ShieldCheck className="size-3.5" />}{isLegacy ? "Legacy server connection" : "Meta Embedded Signup"}</p>{expiresAt && <p className="text-xs text-muted-foreground"><Clock3 className="mr-1 inline size-3" />Expires {expiresAt.toLocaleDateString()}</p>}</div>
      </div>}
      {connection?.last_error && <p className="mt-3 text-xs text-destructive">{connection.last_error}</p>}
      {signupError && <p role="alert" className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{signupError}</p>}
      <div className="mt-4 flex flex-col justify-between gap-3 border-t pt-4 sm:flex-row sm:items-center">
        <p className="text-xs text-muted-foreground">{signupInProgress ? "Complete the secure Meta window to finish connecting this business number." : isLegacy ? "Reconnect to let this workspace choose and authorize its own number." : connection ? "Messages use this workspace's encrypted Meta authorization." : "A Meta window will guide you through selecting or adding a business number."}</p>
        {canConnect ? <div className="flex shrink-0 gap-2">{connection && <Button type="button" variant="outline" disabled={pending || signupInProgress} onClick={disconnect}><Unplug />Disconnect</Button>}<Button type="button" disabled={pending || signupInProgress || !signupOptions} onClick={connect}>{!signupOptions ? "Configuration required" : signupInProgress ? "Connecting…" : connection ? "Reconnect" : "Connect WhatsApp"}</Button></div> : <p className="text-sm text-muted-foreground">Only workspace admins can manage this connection.</p>}
      </div>
    </section>
  )
}
