import { getWhatsAppAppSecret, getWhatsAppWebhookVerifyToken } from "@/lib/whatsapp/config"
import { verifyWhatsAppSignature } from "@/lib/whatsapp/security"
import { isWhatsAppWebhookPayload } from "@/lib/whatsapp/webhook"
import { ingestWhatsAppWebhook } from "@/lib/whatsapp/ingest"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request): Promise<Response> {
  const query = new URL(request.url).searchParams
  const mode = query.get("hub.mode")
  const suppliedToken = query.get("hub.verify_token")
  const challenge = query.get("hub.challenge")

  try {
    if (mode !== "subscribe" || !challenge || suppliedToken !== getWhatsAppWebhookVerifyToken()) {
      return new Response("Forbidden", { status: 403 })
    }
    return new Response(challenge, { status: 200, headers: { "Content-Type": "text/plain" } })
  } catch (error) {
    console.error("[whatsapp/webhook/verify]", error)
    return new Response("WhatsApp webhook is not configured", { status: 503 })
  }
}

export async function POST(request: Request): Promise<Response> {
  const rawBody = await request.text()

  try {
    if (!verifyWhatsAppSignature(rawBody, request.headers.get("x-hub-signature-256"), getWhatsAppAppSecret())) {
      return Response.json({ error: "Invalid signature" }, { status: 401 })
    }

    const payload: unknown = JSON.parse(rawBody)
    if (!isWhatsAppWebhookPayload(payload)) {
      return Response.json({ error: "Invalid WhatsApp payload" }, { status: 400 })
    }

    const result = await ingestWhatsAppWebhook(payload)
    return Response.json({ received: true, ...result })
  } catch (error) {
    console.error("[whatsapp/webhook]", error)
    return Response.json({ error: "Webhook processing failed" }, { status: 400 })
  }
}
