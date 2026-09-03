import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { getAuthedOrgClient } from "@/lib/auth/org"
import { getGoogleOAuthConfig, GOOGLE_IDENTITY_SCOPES } from "@/lib/gmail/config"
import { createOAuthState } from "@/lib/gmail/oauth-state"

export const runtime = "nodejs"

export async function GET() {
  const { ctx } = await getAuthedOrgClient()
  if (!ctx) return NextResponse.redirect(new URL("/sign-in", process.env.NEXT_PUBLIC_APP_URL))
  if (ctx.role === "viewer") return NextResponse.redirect(new URL("/settings?gmail=forbidden", process.env.NEXT_PUBLIC_APP_URL))

  const { clientId, redirectUri } = getGoogleOAuthConfig()
  const state = createOAuthState(ctx.userId, ctx.orgId)
  const cookieStore = await cookies()
  cookieStore.set("reachflow_gmail_oauth_state", state, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 600 })

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth")
  url.search = new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, response_type: "code", scope: GOOGLE_IDENTITY_SCOPES.join(" "), access_type: "offline", prompt: "consent", include_granted_scopes: "true", state }).toString()
  return NextResponse.redirect(url)
}
