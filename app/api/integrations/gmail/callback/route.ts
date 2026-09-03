import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

import { getAuthedOrgClient } from "@/lib/auth/org"
import { exchangeAuthorizationCode, getGoogleIdentity } from "@/lib/gmail/client"
import { encryptGmailToken } from "@/lib/gmail/crypto"
import { verifyOAuthState } from "@/lib/gmail/oauth-state"

export const runtime = "nodejs"

function settingsRedirect(request: NextRequest, result: string) {
  return NextResponse.redirect(new URL(`/settings?gmail=${encodeURIComponent(result)}`, request.url))
}

export async function GET(request: NextRequest) {
  const cookieStore = await cookies()
  const cookieState = cookieStore.get("reachflow_gmail_oauth_state")?.value
  cookieStore.delete("reachflow_gmail_oauth_state")
  const requestState = request.nextUrl.searchParams.get("state")
  const code = request.nextUrl.searchParams.get("code")
  const providerError = request.nextUrl.searchParams.get("error")
  if (providerError) return settingsRedirect(request, providerError)
  if (!cookieState || !requestState || cookieState !== requestState || !code) return settingsRedirect(request, "invalid_state")

  const state = verifyOAuthState(requestState)
  const { ctx } = await getAuthedOrgClient()
  if (!state || !ctx || state.userId !== ctx.userId || state.orgId !== ctx.orgId) return settingsRedirect(request, "invalid_state")

  try {
    const tokens = await exchangeAuthorizationCode(code)
    if (!tokens.refresh_token) throw new Error("Google did not issue offline access; remove ReachFlow from Google connections and try again")
    const identity = await getGoogleIdentity(tokens.access_token!)
    const scopes = (tokens.scope ?? "").split(" ").filter(Boolean)
    const { error } = await ctx.supabase.from("gmail_connections").upsert({
      org_id: ctx.orgId,
      user_id: ctx.userId,
      google_account_id: identity.id,
      email_address: identity.email,
      access_token_ciphertext: encryptGmailToken(tokens.access_token!),
      refresh_token_ciphertext: encryptGmailToken(tokens.refresh_token),
      granted_scopes: scopes,
      status: "active",
      token_expires_at: new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000).toISOString(),
      last_error: null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "org_id,user_id" })
    if (error) throw error
    return settingsRedirect(request, "connected")
  } catch (error) {
    console.error("[gmail/callback]", error)
    return settingsRedirect(request, "connection_failed")
  }
}
