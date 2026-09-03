import { createAdminClient } from "@/lib/supabase/admin"
import { getValidAccessToken, watchGmailMailbox, type GmailConnectionRecord } from "@/lib/gmail/client"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request): Promise<Response> {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }
  const topicName = process.env.GMAIL_PUBSUB_TOPIC
  if (!topicName) return Response.json({ error: "GMAIL_PUBSUB_TOPIC is not configured" }, { status: 503 })

  const admin = createAdminClient()
  const renewalCutoff = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
  const { data: connections, error } = await admin
    .from("gmail_connections")
    .select("*")
    .eq("status", "active")
    .or(`watch_expiration_at.is.null,watch_expiration_at.lt.${renewalCutoff}`)
  if (error) return Response.json({ error: error.message }, { status: 500 })

  let renewed = 0
  const failures: Array<{ id: string; error: string }> = []
  for (const connection of connections ?? []) {
    try {
      const token = await getValidAccessToken(connection as GmailConnectionRecord)
      const watch = await watchGmailMailbox(token.accessToken, topicName)
      await admin.from("gmail_connections").update({
        ...(token.refreshed ? { access_token_ciphertext: token.refreshed.accessTokenCiphertext, token_expires_at: token.refreshed.expiresAt } : {}),
        history_id: connection.history_id ?? watch.historyId,
        watch_expiration_at: watch.expiration,
        last_error: null,
        updated_at: new Date().toISOString(),
      }).eq("id", connection.id)
      renewed += 1
    } catch (cause) {
      const reason = cause instanceof Error ? cause.message : "Watch renewal failed"
      failures.push({ id: connection.id, error: reason })
      await admin.from("gmail_connections").update({ last_error: reason, updated_at: new Date().toISOString() }).eq("id", connection.id)
    }
  }
  return Response.json({ checked: connections?.length ?? 0, renewed, failures })
}
