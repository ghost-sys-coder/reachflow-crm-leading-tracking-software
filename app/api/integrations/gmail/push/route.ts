import { createAdminClient } from "@/lib/supabase/admin"
import { incrementalGmailSync } from "@/lib/gmail/sync"
import type { GmailConnectionRecord } from "@/lib/gmail/client"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type PushEnvelope = { message?: { data?: string; messageId?: string } }

export async function POST(request: Request): Promise<Response> {
  const expectedToken = process.env.GMAIL_PUBSUB_VERIFICATION_TOKEN
  const suppliedToken = new URL(request.url).searchParams.get("token")
  if (!expectedToken || suppliedToken !== expectedToken) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const envelope = await request.json() as PushEnvelope
    if (!envelope.message?.data) return Response.json({ received: true })
    const payload = JSON.parse(Buffer.from(envelope.message.data, "base64url").toString("utf8")) as {
      emailAddress?: string
      historyId?: string
    }
    if (!payload.emailAddress || !payload.historyId) return Response.json({ received: true })

    const admin = createAdminClient()
    const { data: connection } = await admin
      .from("gmail_connections")
      .select("*")
      .eq("email_address", payload.emailAddress.toLowerCase())
      .eq("status", "active")
      .maybeSingle()
    if (!connection) return Response.json({ received: true })

    await incrementalGmailSync(connection as GmailConnectionRecord & {
      org_id: string
      user_id: string
      email_address: string
      history_id: string | null
    })
    return Response.json({ received: true })
  } catch (error) {
    console.error("[gmail/push]", error)
    return Response.json({ error: "Synchronization failed" }, { status: 500 })
  }
}
