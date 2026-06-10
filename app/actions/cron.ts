"use server"

import { headers } from "next/headers"

import { getAuthedClient } from "@/lib/auth/session"
import { getAuthedOrgClient } from "@/lib/auth/org"
import { sendMail } from "@/lib/email/mailer"
import { digestEmailHtml } from "@/lib/email/templates/follow-up-digest"
import { fail, ok } from "@/lib/validation/result"
import type { ActionResult } from "@/types/database"

// Sends the follow-up digest email to the currently logged-in user for their org.
// Applies the same date filter as the production cron — useful to verify SMTP and preview email content.
export async function triggerFollowUpDigest(): Promise<
  ActionResult<{ prospectCount: number }>
> {
  const { supabase, user } = await getAuthedClient()
  if (!user) return fail("Not authenticated")

  const email = user.email
  if (!email) return fail("No email address on account")

  const { ctx, error: orgError } = await getAuthedOrgClient()
  if (!ctx) return fail(orgError)

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ""

  const [profileRes, orgRes] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).single(),
    supabase
      .from("organizations")
      .select("white_label_enabled, agency_name, brand_primary_color")
      .eq("id", ctx.orgId)
      .single(),
  ])

  const userName = profileRes.data?.full_name ?? email
  const whiteLabelEnabled = orgRes.data?.white_label_enabled ?? false
  const brandName = whiteLabelEnabled ? (orgRes.data?.agency_name ?? undefined) : undefined
  const primaryColor = whiteLabelEnabled ? (orgRes.data?.brand_primary_color ?? undefined) : undefined

  const now = new Date()
  const endOfToday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999),
  )

  const { data: prospects } = await supabase
    .from("prospects")
    .select("id, business_name, platform, status, handle, follow_up_at")
    .eq("org_id", ctx.orgId)
    .not("follow_up_at", "is", null)
    .lte("follow_up_at", endOfToday.toISOString())
    .neq("status", "closed")
    .neq("status", "dead")
    .order("follow_up_at", { ascending: true })

  const prospectList = prospects ?? []

  try {
    await sendMail({
      to: email,
      subject: `[Test] Follow-up digest — ${brandName ?? "ReachFlow"}`,
      html: digestEmailHtml({
        userName,
        prospects: prospectList,
        appUrl,
        brandName,
        primaryColor,
      }),
      fromName: brandName,
    })
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Failed to send email — check SMTP settings")
  }

  return ok({ prospectCount: prospectList.length })
}

// Triggers the sequence-runner cron for the current deployment by calling the API route
// with the CRON_SECRET. Scoped to due steps across all orgs (same as production cron).
export async function triggerSequenceRunner(): Promise<
  ActionResult<{ processed: number }>
> {
  const { user } = await getAuthedClient()
  if (!user) return fail("Not authenticated")

  const secret = process.env.CRON_SECRET
  if (!secret) return fail("CRON_SECRET environment variable is not set")

  const headersList = await headers()
  const host = headersList.get("host") ?? "localhost:3000"
  const proto =
    host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https"
  const baseUrl = `${proto}://${host}`

  try {
    const res = await fetch(`${baseUrl}/api/cron/sequence-runner`, {
      headers: { authorization: `Bearer ${secret}` },
      cache: "no-store",
    })
    const json = (await res.json()) as { processed?: number; error?: string }
    if (!res.ok) return fail(json.error ?? `Cron request failed (${res.status})`)
    return ok({ processed: json.processed ?? 0 })
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Failed to reach sequence-runner endpoint")
  }
}
