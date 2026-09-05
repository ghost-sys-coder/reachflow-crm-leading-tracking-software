"use client"

import * as React from "react"
import { CheckCircle2, Clock3, MessageCircle, RefreshCw, ShieldCheck, Unplug } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { disconnectWhatsApp, type WhatsAppConnectionSummary, type WhatsAppSignupOptions } from "@/app/actions/whatsapp"
import { Button } from "@/components/ui/button"

type MetaLoginResponse = { authResponse?: { code?: string }; status?: string; error?: { message?: string }; error_message?: string }
type SignupSelection = { businessAccountId: string; phoneNumberId?: string }
type FacebookSdk = NonNullable<Window["FB"]>
type SignupDiagnosticPhase = "sdk_initialized" | "sdk_error" | "login_started" | "login_callback" | "session_event" | "callback_started" | "callback_finished" | "failed"

declare global {
  interface Window {
    FB?: {
      init(options: { appId: string; cookie: boolean; xfbml: boolean; version: string }): void
      login(callback: (response: MetaLoginResponse) => void, options: Record<string, unknown>): void
    }
    fbAsyncInit?: () => void
  }
}

function readyFacebookSdk() {
  const sdk = window.FB
  if (!sdk) return null
  // The outer sdk.js installs a login stub that only pushes into __buffer.calls.
  // Meta may retain the buffer object after swapping in the real methods, so the
  // method implementation—not the object's presence—is the reliable boundary.
  const loginSource = Function.prototype.toString.call(sdk.login)
  return loginSource.includes("__buffer") || loginSource.includes("calls.push") ? null : sdk
}

async function loadFacebookSdk(appId: string) {
  const existingSdk = readyFacebookSdk()
  const existing = document.getElementById("facebook-jssdk") as HTMLScriptElement | null
  if (!existing) {
    const script = document.createElement("script")
    script.id = "facebook-jssdk"
    script.async = true
    script.defer = true
    script.crossOrigin = "anonymous"
    script.src = "https://connect.facebook.net/en_US/sdk.js"
    script.onerror = () => script.dataset.loadFailed = "true"
    document.body.appendChild(script)
  }

  const sdk = existingSdk ?? await new Promise<FacebookSdk>((resolve, reject) => {
    const startedAt = Date.now()
    const poll = window.setInterval(() => {
      const script = document.getElementById("facebook-jssdk") as HTMLScriptElement | null
      if (script?.dataset.loadFailed === "true") {
        window.clearInterval(poll)
        reject(new Error("Meta's signup SDK was blocked from loading. Check browser privacy or content-blocking settings."))
        return
      }
      const ready = readyFacebookSdk()
      if (ready) {
        window.clearInterval(poll)
        resolve(ready)
        return
      }
      if (Date.now() - startedAt >= 15_000) {
        window.clearInterval(poll)
        reject(new Error("Meta's signup SDK did not finish loading. Check browser privacy or content-blocking settings, then retry."))
      }
    }, 50)
  })

  const script = document.getElementById("facebook-jssdk") as HTMLScriptElement | null
  if (script?.dataset.initializedAppId !== appId) {
    sdk.init({ appId, cookie: true, xfbml: false, version: "v24.0" })
    if (script) script.dataset.initializedAppId = appId
  }
  return sdk
}

function parseSignupEvent(event: MessageEvent): SignupSelection | null {
  const payload = parseMetaSignupPayload(event)
  if (payload?.type !== "WA_EMBEDDED_SIGNUP" || !String(payload?.event ?? "").startsWith("FINISH")) return null
  const businessAccountId = payload.data?.waba_id
  const phoneNumberId = payload.data?.phone_number_id
  if (typeof businessAccountId !== "string" && typeof businessAccountId !== "number") return null
  return {
    businessAccountId: String(businessAccountId),
    phoneNumberId: typeof phoneNumberId === "string" || typeof phoneNumberId === "number" ? String(phoneNumberId) : undefined,
  }
}

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
  const [sdkReady, setSdkReady] = React.useState(false)
  const facebookRef = React.useRef<FacebookSdk | null>(null)

  React.useEffect(() => {
    if (!canConnect || !signupOptions) return
    let active = true
    void loadFacebookSdk(signupOptions.appId).then((facebook) => {
      if (!active) return
      facebookRef.current = facebook
      setSdkReady(true)
      reportSignupDiagnostic("sdk_initialized", crypto.randomUUID())
    }).catch((cause) => {
      if (!active) return
      const message = cause instanceof Error ? cause.message : "Could not load Meta's signup SDK"
      reportSignupDiagnostic("sdk_error", crypto.randomUUID(), message)
      setSignupError(message)
      setSdkReady(false)
    })
    return () => { active = false }
  }, [canConnect, signupOptions])

  function connect() {
    if (window.location.protocol !== "https:") {
      const message = "Meta requires HTTPS. Restart locally with `npm run dev:https`, or connect from crm.veilcode.studio."
      setSignupError(message)
      toast.error(message, { duration: 7000 })
      return
    }
    const facebook = facebookRef.current
    if (!facebook || !sdkReady || !signupOptions) {
      const message = signupError ?? "Meta is still loading. Wait a moment and try again."
      setSignupError(message)
      toast.error(message)
      return
    }
    setSignupError(null)
    setSignupInProgress(true)
    const attemptId = crypto.randomUUID()
    try {
        const signup = signupOptions
        let code: string | undefined
        let selection: SignupSelection | null = null
        let completing = false
        const timers: { completion?: number } = {}
        const stopListening = () => {
          window.removeEventListener("message", onMessage)
          if (timers.completion !== undefined) window.clearTimeout(timers.completion)
        }
        const failSignup = (message: string) => {
          stopListening()
          reportSignupDiagnostic("failed", attemptId, message)
          setSignupInProgress(false)
          setSignupError(message)
          toast.error(message)
        }

        const complete = async () => {
          if (!code || !selection || completing) return
          completing = true
          stopListening()
          reportSignupDiagnostic("callback_started", attemptId)
          const response = await fetch("/api/integrations/whatsapp/callback", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code, state: signup.state, ...selection }),
          })
          const result = await response.json() as { error?: string }
          reportSignupDiagnostic("callback_finished", attemptId, String(response.status))
          if (!response.ok) throw new Error(result.error ?? "Could not connect WhatsApp")
          setSignupInProgress(false)
          setSignupError(null)
          toast.success("Your WhatsApp business number is connected")
          router.refresh()
        }
        const onMessage = (event: MessageEvent) => {
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
          const parsed = parseSignupEvent(event)
          if (!parsed) return
          selection = parsed
          void complete().catch((cause) => {
            setSignupInProgress(false)
            const message = cause instanceof Error ? cause.message : "Could not connect WhatsApp"
            setSignupError(message)
            toast.error(message)
          })
        }
        window.addEventListener("message", onMessage)
        timers.completion = window.setTimeout(() => {
          const reason = code
            ? "Meta authorized access but did not return the selected WhatsApp account. Reopen signup and finish the final confirmation step."
            : selection
              ? "Meta returned the WhatsApp account but did not return an authorization code. Check the Facebook Login for Business configuration."
              : "Meta did not return signup details. Allow the popup, complete every Meta step and try again."
          failSignup(reason)
        }, 10 * 60_000)
        facebook.login((response) => {
          code = response.authResponse?.code
          reportSignupDiagnostic("login_callback", attemptId, code ? "code_received" : String(response.status ?? response.error?.message ?? response.error_message ?? "no_code"))
          if (!code) {
            failSignup("WhatsApp signup was cancelled or not authorized")
            return
          }
          void complete().catch((cause) => {
            setSignupInProgress(false)
            const message = cause instanceof Error ? cause.message : "Could not connect WhatsApp"
            setSignupError(message)
            toast.error(message)
          })
        }, {
          config_id: signup.configurationId,
          auth_type: "rerequest",
          response_type: "code",
          override_default_response_type: true,
          extras: { setup: {} },
        })
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
        {canConnect ? <div className="flex shrink-0 gap-2">{connection && <Button type="button" variant="outline" disabled={pending || signupInProgress} onClick={disconnect}><Unplug />Disconnect</Button>}<Button type="button" disabled={pending || signupInProgress || !sdkReady || !signupOptions} onClick={connect}>{!signupOptions ? "Configuration required" : !sdkReady ? "Loading Meta…" : signupInProgress ? "Opening Meta…" : connection ? "Reconnect" : "Connect WhatsApp"}</Button></div> : <p className="text-sm text-muted-foreground">Only workspace admins can manage this connection.</p>}
      </div>
    </section>
  )
}
