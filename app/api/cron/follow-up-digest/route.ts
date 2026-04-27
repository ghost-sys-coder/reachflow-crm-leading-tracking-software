import { createAdminClient } from "@/lib/supabase/admin"
import { sendMail } from "@/lib/email/mailer"
import { digestEmailHtml } from "@/lib/email/templates/follow-up-digest"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Supabase returns nested one-to-one foreign keys as an array in its TS inference
type MembershipProfile = { follow_up_digest: boolean; full_name: string | null }
type Membership = {
  org_id: string
  user_id: string
  role: string
  profiles: MembershipProfile[] | MembershipProfile | null
}

type ProspectRow = {
  id: string
  business_name: string
  platform: string
  status: string
  handle: string | null
  follow_up_at: string | null
}

export async function GET(request: Request): Promise<Response> {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const admin   = createAdminClient()
  const appUrl  = process.env.NEXT_PUBLIC_APP_URL ?? ""

  // End of today UTC — include prospects due any time today
  const now = new Date()
  const endOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999))

  // All org memberships where the user has digest enabled
  const { data: memberships, error: membErr } = await admin
    .from("organization_members")
    .select("org_id, user_id, role, profiles(follow_up_digest, full_name)")

  if (membErr) {
    console.error("[digest] memberships query failed:", membErr.message)
    return Response.json({ error: membErr.message }, { status: 500 })
  }

  function profileOf(m: Membership): MembershipProfile | null {
    if (!m.profiles) return null
    return Array.isArray(m.profiles) ? (m.profiles[0] ?? null) : m.profiles
  }

  const active = ((memberships ?? []) as unknown as Membership[]).filter(
    (m) => profileOf(m)?.follow_up_digest === true,
  )

  if (active.length === 0) return Response.json({ sent: 0 })

  // Bulk-fetch auth users to avoid N+1
  const { data: { users }, error: usersErr } = await admin.auth.admin.listUsers({ perPage: 1000 })
  if (usersErr) {
    console.error("[digest] auth.admin.listUsers failed:", usersErr.message)
    return Response.json({ error: usersErr.message }, { status: 500 })
  }

  const emailMap = new Map(users.map((u) => [u.id, u.email ?? ""]))

  let sent = 0

  for (const m of active) {
    const email = emailMap.get(m.user_id)
    if (!email) continue

    let query = admin
      .from("prospects")
      .select("id, business_name, platform, status, handle, follow_up_at")
      .eq("org_id", m.org_id)
      .not("follow_up_at", "is", null)
      .lte("follow_up_at", endOfToday.toISOString())
      .neq("status", "closed")
      .neq("status", "dead")
      .order("follow_up_at", { ascending: true })

    // Non-admins only see their own assigned prospects
    if (m.role !== "admin") {
      query = query.eq("assigned_to", m.user_id)
    }

    const { data: prospects } = await query
    if (!prospects?.length) continue

    const userName = profileOf(m)?.full_name ?? email

    try {
      await sendMail({
        to: email,
        subject: `${prospects.length} prospect${prospects.length !== 1 ? "s" : ""} due for follow-up — ReachFlow`,
        html: digestEmailHtml({ userName, prospects: prospects as ProspectRow[], appUrl }),
      })
      sent++
    } catch (err) {
      console.error(`[digest] failed to send to ${email}:`, err)
    }
  }

  return Response.json({ sent })
}
