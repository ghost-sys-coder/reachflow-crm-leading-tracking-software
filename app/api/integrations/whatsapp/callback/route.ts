import { z } from "zod"

import { getAuthedOrgClient } from "@/lib/auth/org"
import {
  exchangeWhatsAppSignupCode,
  getWhatsAppAccountNumbers,
  inspectWhatsAppToken,
  subscribeWhatsAppAccount,
  type WhatsAppApiCredentials,
} from "@/lib/whatsapp/client"
import { getWhatsAppEmbeddedSignupConfig } from "@/lib/whatsapp/config"
import { encryptWhatsAppToken } from "@/lib/whatsapp/crypto"
import { verifyWhatsAppSignupState } from "@/lib/whatsapp/signup-state"

export const runtime = "nodejs"

const bodySchema = z.object({
  code: z.string().min(8).max(4096),
  state: z.string().min(16).max(4096),
  attemptId: z.string().uuid().optional(),
  businessAccountId: z.string().regex(/^\d+$/).optional(),
  phoneNumberId: z.string().regex(/^\d+$/).optional(),
})

type SignupInput = z.infer<typeof bodySchema>
type AuthedOrgContext = NonNullable<Awaited<ReturnType<typeof getAuthedOrgClient>>["ctx"]>

async function completeConnection(ctx: AuthedOrgContext, input: SignupInput) {
  const config = getWhatsAppEmbeddedSignupConfig()
  console.info("[whatsapp:embedded-signup] callback", { phase: "code_exchange_started", attemptId: input.attemptId, orgId: ctx.orgId })
  const exchanged = await exchangeWhatsAppSignupCode(input.code)
  const inspected = await inspectWhatsAppToken(exchanged.accessToken)
  if (!inspected.data.is_valid || inspected.data.app_id !== config.appId) throw new Error("Meta returned a token for a different application")

  const scopes = inspected.data.scopes ?? []
  const requiredScopes = ["whatsapp_business_management", "whatsapp_business_messaging"]
  if (requiredScopes.some((scope) => !scopes.includes(scope))) throw new Error("The WhatsApp connection did not grant all required permissions")

  const authorizedBusinessAccountIds = [...new Set(
    (inspected.data.granular_scopes ?? [])
      .filter((scope) => scope.scope === "whatsapp_business_management")
      .flatMap((scope) => scope.target_ids ?? [])
      .filter((id) => /^\d+$/.test(id)),
  )]
  if (input.businessAccountId && authorizedBusinessAccountIds.length && !authorizedBusinessAccountIds.includes(input.businessAccountId)) {
    throw new Error("The selected WhatsApp Business Account was not authorized by Meta")
  }
  const businessAccountId = input.businessAccountId
    ?? (authorizedBusinessAccountIds.length === 1 ? authorizedBusinessAccountIds[0] : undefined)
  if (!businessAccountId) {
    throw new Error(authorizedBusinessAccountIds.length > 1
      ? "Meta authorized multiple WhatsApp Business Accounts but did not identify the selected one. Reopen signup and select one account."
      : "Meta did not grant access to a WhatsApp Business Account. Check the Embedded Signup configuration assets and permissions.")
  }

  const credentials: WhatsAppApiCredentials = {
    accessToken: exchanged.accessToken,
    businessAccountId,
    phoneNumberId: input.phoneNumberId ?? "",
  }
  const numbers = await getWhatsAppAccountNumbers(credentials)
  const number = credentials.phoneNumberId
    ? numbers.data?.find((candidate) => candidate.id === credentials.phoneNumberId)
    : numbers.data?.length === 1 ? numbers.data[0] : null
  if (!number) throw new Error(credentials.phoneNumberId
    ? "The selected phone number does not belong to the authorized WhatsApp Business Account"
    : "Meta did not identify a single WhatsApp phone number for this account")
  credentials.phoneNumberId = number.id
  await subscribeWhatsAppAccount(credentials)

  const now = new Date()
  const expirySeconds = inspected.data.expires_at || (exchanged.expiresIn ? Math.floor(now.getTime() / 1000) + exchanged.expiresIn : 0)
  const { data, error: dbError } = await ctx.supabase.from("whatsapp_connections").upsert({
    org_id: ctx.orgId,
    connected_by: ctx.userId,
    business_account_id: credentials.businessAccountId,
    phone_number_id: credentials.phoneNumberId,
    display_phone_number: number.display_phone_number ?? null,
    verified_name: number.verified_name ?? null,
    access_token_ciphertext: encryptWhatsAppToken(credentials.accessToken),
    token_issued_at: now.toISOString(),
    token_expires_at: expirySeconds ? new Date(expirySeconds * 1000).toISOString() : null,
    meta_user_id: inspected.data.user_id ?? null,
    granted_scopes: scopes,
    connection_method: "embedded_signup",
    status: "active",
    deauthorized_at: null,
    last_error: null,
    updated_at: now.toISOString(),
  }, { onConflict: "org_id" }).select("id,display_phone_number,verified_name,status,connection_method,token_expires_at,last_message_at,last_error").single()
  if (dbError) throw new Error(dbError.message)
  console.info("[whatsapp:embedded-signup] callback", { phase: "connection_saved", attemptId: input.attemptId, orgId: ctx.orgId })
  return data
}

function callbackPage(request: Request, result: { success: boolean; error?: string }) {
  const url = new URL(request.url)
  const payload = JSON.stringify({ type: "REACHFLOW_WHATSAPP_OAUTH", ...result }).replace(/</g, "\\u003c")
  const targetOrigin = JSON.stringify(url.origin)

  return new Response(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>WhatsApp connection</title></head>
<body><p id="status">Returning to ReachFlow&hellip;</p><script>
(function () {
  var payload = ${payload};
  try {
    var channel = new BroadcastChannel("reachflow-whatsapp-oauth");
    channel.postMessage(payload);
    setTimeout(function () { channel.close(); }, 250);
  } catch (_) {}
  try {
    if (window.opener) window.opener.postMessage(payload, ${targetOrigin});
  } catch (_) {}
  document.getElementById("status").textContent = payload.success ? "WhatsApp connected. You can close this window." : payload.error || "Meta could not complete the connection.";
  if (payload.success) setTimeout(function () { window.close(); }, 300);
})();
</script></body></html>`, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Content-Security-Policy": "default-src 'none'; script-src 'unsafe-inline'; style-src 'none'; base-uri 'none'; frame-ancestors 'none'",
      "Referrer-Policy": "no-referrer",
    },
  })
}

export async function POST(request: Request) {
  const { ctx, error } = await getAuthedOrgClient()
  if (!ctx) return Response.json({ error }, { status: 401 })
  if (ctx.role !== "admin") return Response.json({ error: "Only workspace admins can connect WhatsApp" }, { status: 403 })

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: "Invalid WhatsApp signup response" }, { status: 400 })
  if (!verifyWhatsAppSignupState(parsed.data.state, ctx.orgId, ctx.userId)) {
    return Response.json({ error: "This WhatsApp signup session expired. Please try again." }, { status: 400 })
  }

  try {
    const connection = await completeConnection(ctx, parsed.data)
    return Response.json({ connection })
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Could not connect WhatsApp"
    console.error("[whatsapp:embedded-signup] callback", { phase: "failed", attemptId: parsed.data.attemptId, orgId: ctx.orgId, message })
    return Response.json({ error: message }, { status: 400 })
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const state = url.searchParams.get("state")
  const metaError = url.searchParams.get("error_message")
    ?? url.searchParams.get("error_description")
    ?? (url.searchParams.get("error") ? "Meta did not authorize the WhatsApp connection." : null)
  console.info("[whatsapp:embedded-signup] callback", {
    phase: "oauth_redirect_received",
    hasCode: Boolean(code),
    hasState: Boolean(state),
    error: metaError,
  })
  if (metaError) return callbackPage(request, { success: false, error: metaError })

  const { ctx, error } = await getAuthedOrgClient()
  if (!ctx) return callbackPage(request, { success: false, error: error ?? "Your ReachFlow session expired. Sign in and try again." })
  if (ctx.role !== "admin") return callbackPage(request, { success: false, error: "Only workspace admins can connect WhatsApp" })

  const parsed = bodySchema.safeParse({ code, state })
  if (!parsed.success) return callbackPage(request, { success: false, error: "Meta returned an invalid WhatsApp signup response." })
  if (!verifyWhatsAppSignupState(parsed.data.state, ctx.orgId, ctx.userId)) {
    return callbackPage(request, { success: false, error: "This WhatsApp signup session expired. Please try again." })
  }

  try {
    await completeConnection(ctx, parsed.data)
    return callbackPage(request, { success: true })
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Could not connect WhatsApp"
    console.error("[whatsapp:embedded-signup] callback", { phase: "failed", orgId: ctx.orgId, message })
    return callbackPage(request, { success: false, error: message })
  }
}
