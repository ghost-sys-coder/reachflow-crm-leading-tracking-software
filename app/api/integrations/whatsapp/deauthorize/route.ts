import { createAdminClient } from "@/lib/supabase/admin"
import { getWhatsAppAppSecret } from "@/lib/whatsapp/config"
import { decodeMetaSignedRequest } from "@/lib/whatsapp/security"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null)
  const signedRequest = form?.get("signed_request")
  if (typeof signedRequest !== "string") return Response.json({ error: "Missing signed_request" }, { status: 400 })
  const payload = decodeMetaSignedRequest(signedRequest, getWhatsAppAppSecret())
  if (!payload?.user_id) return Response.json({ error: "Invalid signed_request" }, { status: 401 })

  const now = new Date().toISOString()
  const { error } = await createAdminClient().from("whatsapp_connections").update({
    status: "revoked",
    access_token_ciphertext: null,
    deauthorized_at: now,
    last_error: "Meta authorization was removed",
    updated_at: now,
  }).eq("meta_user_id", payload.user_id)
  if (error) return Response.json({ error: "Could not revoke connection" }, { status: 500 })
  return Response.json({ success: true })
}
