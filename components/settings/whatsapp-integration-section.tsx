"use client"

import * as React from "react"
import { CheckCircle2, Clock3, MessageCircle, Plug, RefreshCw, ShieldCheck, Unplug } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { disconnectWhatsApp, getWhatsAppSignupOptions, type WhatsAppConnectionSummary } from "@/app/actions/whatsapp"
import { Button } from "@/components/ui/button"

type MetaLoginResponse = { authResponse?: { code?: string } }
type SignupSelection = { businessAccountId: string; phoneNumberId: string }
type FacebookSdk = NonNullable<Window["FB"]>
let facebookSdkPromise: Promise<FacebookSdk> | null = null
let initializedFacebookAppId: string | null = null

declare global {
  interface Window {
    FB?: {
      init(options: { appId: string; cookie: boolean; xfbml: boolean; version: string }): void
      login(callback: (response: MetaLoginResponse) => void, options: Record<string, unknown>): void
    }
    fbAsyncInit?: () => void
  }
}

function loadFacebookSdk(appId: string) {
  if (initializedFacebookAppId === appId && window.FB) return Promise.resolve(window.FB)
  if (facebookSdkPromise) return facebookSdkPromise

  facebookSdkPromise = new Promise<FacebookSdk>((resolve, reject) => {
    let settled = false
    const timeout = window.setTimeout(() => {
      if (settled) return
      settled = true
      facebookSdkPromise = null
      reject(new Error("Meta's signup SDK did not finish loading. Refresh and try again."))
    }, 10_000)
    const initialize = () => {
      const sdk = window.FB
      if (settled || !sdk) return false
      try {
        sdk.init({ appId, cookie: true, xfbml: false, version: "v24.0" })
        initializedFacebookAppId = appId
        settled = true
        window.clearTimeout(timeout)
        resolve(sdk)
        return true
      } catch (cause) {
        settled = true
        facebookSdkPromise = null
        window.clearTimeout(timeout)
        reject(cause instanceof Error ? cause : new Error("Could not initialize Meta's signup SDK"))
        return false
      }
    }

    const previousAsyncInit = window.fbAsyncInit
    window.fbAsyncInit = () => {
      previousAsyncInit?.()
      initialize()
    }
    const existing = document.getElementById("facebook-jssdk") as HTMLScriptElement | null
    if (existing) {
      existing.addEventListener("load", initialize, { once: true })
      if (window.FB) window.setTimeout(initialize, 0)
      return
    }
    const script = document.createElement("script")
    script.id = "facebook-jssdk"
    script.async = true
    script.defer = true
    script.crossOrigin = "anonymous"
    script.src = "https://connect.facebook.net/en_US/sdk.js"
    script.addEventListener("load", initialize, { once: true })
    script.onerror = () => {
      window.clearTimeout(timeout)
      if (!settled) {
        settled = true
        facebookSdkPromise = null
        reject(new Error("Could not load Meta's signup window"))
      }
    }
    document.body.appendChild(script)
  })
  return facebookSdkPromise
}

function parseSignupEvent(event: MessageEvent): SignupSelection | null {
  if (event.origin !== "https://www.facebook.com" && event.origin !== "https://web.facebook.com") return null
  let payload = event.data
  if (typeof payload === "string") {
    try { payload = JSON.parse(payload) } catch { return null }
  }
  if (payload?.type !== "WA_EMBEDDED_SIGNUP" || payload?.event !== "FINISH") return null
  const businessAccountId = payload.data?.waba_id
  const phoneNumberId = payload.data?.phone_number_id
  return typeof businessAccountId === "string" && typeof phoneNumberId === "string"
    ? { businessAccountId, phoneNumberId }
    : null
}

export function WhatsAppIntegrationSection({ connection, canConnect }: { connection: WhatsAppConnectionSummary | null; canConnect: boolean }) {
  const router = useRouter()
  const [pending, startTransition] = React.useTransition()

  function connect() {
    if (window.location.protocol !== "https:") {
      toast.error("Meta requires HTTPS. Restart locally with `npm run dev:https`, or connect from crm.veilcode.studio.", { duration: 7000 })
      return
    }
    startTransition(async () => {
      const options = await getWhatsAppSignupOptions()
      if (options.error || !options.data) {
        toast.error(options.error ?? "WhatsApp Embedded Signup is not configured")
        return
      }
      const signup = options.data

      try {
        const facebook = await loadFacebookSdk(signup.appId)
        let code: string | undefined
        let selection: SignupSelection | null = null
        let completing = false

        const complete = async () => {
          if (!code || !selection || completing) return
          completing = true
          window.removeEventListener("message", onMessage)
          const response = await fetch("/api/integrations/whatsapp/callback", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code, state: signup.state, ...selection }),
          })
          const result = await response.json() as { error?: string }
          if (!response.ok) throw new Error(result.error ?? "Could not connect WhatsApp")
          toast.success("Your WhatsApp business number is connected")
          router.refresh()
        }
        const onMessage = (event: MessageEvent) => {
          const parsed = parseSignupEvent(event)
          if (!parsed) return
          selection = parsed
          void complete().catch((cause) => toast.error(cause instanceof Error ? cause.message : "Could not connect WhatsApp"))
        }
        window.addEventListener("message", onMessage)
        facebook.login((response) => {
          code = response.authResponse?.code
          if (!code) {
            window.removeEventListener("message", onMessage)
            toast.error("WhatsApp signup was cancelled or not authorized")
            return
          }
          void complete().catch((cause) => toast.error(cause instanceof Error ? cause.message : "Could not connect WhatsApp"))
        }, {
          config_id: signup.configurationId,
          response_type: "code",
          override_default_response_type: true,
          extras: { setup: {}, featureType: "", sessionInfoVersion: "3" },
        })
      } catch (cause) {
        toast.error(cause instanceof Error ? cause.message : "Could not start WhatsApp signup")
      }
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
      <div className="mt-4 flex flex-col justify-between gap-3 border-t pt-4 sm:flex-row sm:items-center">
        <p className="text-xs text-muted-foreground">{isLegacy ? "Reconnect to let this workspace choose and authorize its own number." : connection ? "Messages use this workspace's encrypted Meta authorization." : "A Meta window will guide you through selecting or adding a business number."}</p>
        {canConnect ? <div className="flex shrink-0 gap-2">{connection && <Button type="button" variant="outline" disabled={pending} onClick={disconnect}><Unplug />Disconnect</Button>}<Button type="button" disabled={pending} onClick={connect}>{connection ? <RefreshCw /> : <Plug />}{pending ? "Connecting…" : connection ? "Reconnect" : "Connect WhatsApp"}</Button></div> : <p className="text-sm text-muted-foreground">Only workspace admins can manage this connection.</p>}
      </div>
    </section>
  )
}
