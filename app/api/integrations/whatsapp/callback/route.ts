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
  businessAccountId: z.string().regex(/^\d+$/),
  phoneNumberId: z.string().regex(/^\d+$/),
})

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
    const config = getWhatsAppEmbeddedSignupConfig()
    const exchanged = await exchangeWhatsAppSignupCode(parsed.data.code)
    const inspected = await inspectWhatsAppToken(exchanged.accessToken)
    if (!inspected.data.is_valid || inspected.data.app_id !== config.appId) throw new Error("Meta returned a token for a different application")

    const scopes = inspected.data.scopes ?? []
    const requiredScopes = ["whatsapp_business_management", "whatsapp_business_messaging"]
    if (requiredScopes.some((scope) => !scopes.includes(scope))) throw new Error("The WhatsApp connection did not grant all required permissions")

    const credentials: WhatsAppApiCredentials = {
      accessToken: exchanged.accessToken,
      businessAccountId: parsed.data.businessAccountId,
      phoneNumberId: parsed.data.phoneNumberId,
    }
    const numbers = await getWhatsAppAccountNumbers(credentials)
    const number = numbers.data?.find((candidate) => candidate.id === credentials.phoneNumberId)
    if (!number) throw new Error("The selected phone number does not belong to the authorized WhatsApp Business Account")
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
    return Response.json({ connection: data })
  } catch (cause) {
    return Response.json({ error: cause instanceof Error ? cause.message : "Could not connect WhatsApp" }, { status: 400 })
  }
}

export async function GET() {
  return Response.json({ error: "Complete WhatsApp signup from Settings > Integrations." }, { status: 400 })
}
