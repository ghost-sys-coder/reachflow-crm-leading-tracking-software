"use server"

import { revalidatePath } from "next/cache"

import { getAuthedClient } from "@/lib/auth/session"
import { getAuthedOrgClient } from "@/lib/auth/org"
import { createAdminClient } from "@/lib/supabase/admin"
import { toCsv } from "@/lib/csv/generate"
import { sendMail } from "@/lib/email/mailer"
import { prospectAssignedEmailHtml } from "@/lib/email/templates/prospect-assigned"
import { fail, ok, zodErrorMessage } from "@/lib/validation/result"
import { createNotification } from "@/app/actions/notifications"
import { logActivity } from "@/lib/activity/log"
import { createAdminClient as _adminClient } from "@/lib/supabase/admin"
import {
  PLATFORMS,
  PROSPECT_STATUSES,
  prospectCreateSchema,
  prospectStatusUpdateSchema,
  prospectUpdateSchema,
  type ProspectCreateInput,
  type ProspectStatusUpdateInput,
  type ProspectUpdateInput,
} from "@/lib/validation/schemas"
import type {
  ActionResult,
  Prospect,
  ProspectFilters,
  ProspectWithDetail,
  Tag,
} from "@/types/database"

function revalidateProspectViews() {
  revalidatePath("/pipeline")
  revalidatePath("/prospects", "layout")
}

export async function createProspect(
  input: ProspectCreateInput,
): Promise<ActionResult<Prospect>> {
  const parsed = prospectCreateSchema.safeParse(input)
  if (!parsed.success) return fail(zodErrorMessage(parsed.error))

  const { ctx, error: orgError } = await getAuthedOrgClient()
  if (!ctx) return fail(orgError)
  if (ctx.role === "viewer") return fail("Insufficient permissions")

  const { data, error: insertError } = await ctx.supabase
    .from("prospects")
    .insert({ ...parsed.data, org_id: ctx.orgId })
    .select()
    .single()

  if (insertError) return fail(insertError.message)
  void logActivity({
    orgId: ctx.orgId,
    prospectId: (data as Prospect).id,
    userId: ctx.userId,
    action: "prospect_created",
    newValue: (data as Prospect).business_name,
  })
  revalidateProspectViews()
  return ok(data as Prospect)
}

export async function updateProspect(
  id: string,
  input: ProspectUpdateInput,
): Promise<ActionResult<Prospect>> {
  const parsed = prospectUpdateSchema.safeParse(input)
  if (!parsed.success) return fail(zodErrorMessage(parsed.error))

  const { supabase, user } = await getAuthedClient()
  if (!user) return fail("Not authenticated")

  const { data, error } = await supabase
    .from("prospects")
    .update(parsed.data)
    .eq("id", id)
    .select()
    .single()

  if (error) return fail(error.message)
  const updatedKeys = Object.keys(parsed.data)
  const isNotesOnly = updatedKeys.length === 1 && updatedKeys[0] === "notes"
  void logActivity({
    orgId: (data as Prospect).org_id,
    prospectId: id,
    userId: user.id,
    action: isNotesOnly ? "note_updated" : "prospect_updated",
  })
  revalidateProspectViews()
  return ok(data as Prospect)
}

async function cancelActiveSequencesForProspect(prospectId: string): Promise<void> {
  try {
    const admin = _adminClient()
    const { data: active } = await admin
      .from("prospect_sequences")
      .select("id")
      .eq("prospect_id", prospectId)
      .eq("status", "active")

    if (!active?.length) return

    const ids = active.map((r: { id: string }) => r.id)
    await admin.from("prospect_sequences").update({ status: "completed" }).in("id", ids)
    await admin
      .from("prospect_sequence_steps")
      .update({ status: "skipped", completed_at: new Date().toISOString() })
      .in("prospect_sequence_id", ids)
      .eq("status", "pending")
  } catch {
    // never break parent action
  }
}

export async function updateProspectStatus(
  id: string,
  input: ProspectStatusUpdateInput,
): Promise<ActionResult<Prospect>> {
  const parsed = prospectStatusUpdateSchema.safeParse(input)
  if (!parsed.success) return fail(zodErrorMessage(parsed.error))

  const { ctx, error: orgError } = await getAuthedOrgClient()
  if (!ctx) return fail(orgError)

  const { data: before } = await ctx.supabase
    .from("prospects")
    .select("assigned_to, business_name, org_id, status")
    .eq("id", id)
    .single()

  const { data, error } = await ctx.supabase
    .from("prospects")
    .update({ status: parsed.data.status })
    .eq("id", id)
    .select()
    .single()

  if (error) return fail(error.message)

  if (before?.assigned_to && before.assigned_to !== ctx.userId) {
    await createNotification({
      orgId: ctx.orgId,
      userId: before.assigned_to,
      actorId: ctx.userId,
      type: "status_changed",
      subjectId: id,
      message: `${before.business_name} was moved to ${parsed.data.status}`,
    })
  }

  void logActivity({
    orgId: ctx.orgId,
    prospectId: id,
    userId: ctx.userId,
    action: "status_changed",
    oldValue: before?.status ?? null,
    newValue: parsed.data.status,
  })

  // Auto-complete active sequences when prospect replies or books
  if (parsed.data.status === "replied" || parsed.data.status === "booked") {
    void cancelActiveSequencesForProspect(id)
  }

  revalidateProspectViews()
  return ok(data as Prospect)
}

export async function deleteProspect(id: string): Promise<ActionResult<{ id: string }>> {
  const { supabase, user } = await getAuthedClient()
  if (!user) return fail("Not authenticated")

  const { error } = await supabase.from("prospects").delete().eq("id", id)
  if (error) return fail(error.message)

  revalidateProspectViews()
  return ok({ id })
}

export async function getProspects(
  filters: ProspectFilters = {},
): Promise<ActionResult<Prospect[]>> {
  const { supabase, user } = await getAuthedClient()
  if (!user) return fail("Not authenticated")

  let query = supabase
    .from("prospects")
    .select("*")
    .order("created_at", { ascending: false })

  if (filters.status) query = query.eq("status", filters.status)
  if (filters.platform) query = query.eq("platform", filters.platform)
  if (filters.search) {
    const term = `%${filters.search}%`
    query = query.or(
      `business_name.ilike.${term},handle.ilike.${term},industry.ilike.${term},location.ilike.${term}`,
    )
  }

  const { data, error } = await query
  if (error) return fail(error.message)
  return ok((data ?? []) as Prospect[])
}

async function sendAssignmentEmail(params: {
  assigneeId: string
  actorId: string
  prospect: { id: string; business_name: string; platform: string; handle: string | null }
}) {
  try {
    const admin = createAdminClient()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ""

    const [{ data: assigneeAuth }, { data: actorAuth }, assigneeProfile, actorProfile] =
      await Promise.all([
        admin.auth.admin.getUserById(params.assigneeId),
        admin.auth.admin.getUserById(params.actorId),
        admin.from("profiles").select("full_name").eq("id", params.assigneeId).single(),
        admin.from("profiles").select("full_name").eq("id", params.actorId).single(),
      ])

    const toEmail = assigneeAuth?.user?.email
    if (!toEmail) return

    const recipientName = assigneeProfile.data?.full_name ?? toEmail.split("@")[0]
    const actorName = actorProfile.data?.full_name ?? actorAuth?.user?.email?.split("@")[0] ?? "A team member"

    await sendMail({
      to: toEmail,
      subject: `New lead assigned: ${params.prospect.business_name}`,
      html: prospectAssignedEmailHtml({
        recipientName,
        actorName,
        businessName: params.prospect.business_name,
        platform: params.prospect.platform,
        handle: params.prospect.handle,
        prospectUrl: `${appUrl}/prospects/${params.prospect.id}`,
        settingsUrl: `${appUrl}/settings`,
      }),
    })
  } catch {
    // email failures must never break the parent action
  }
}

export async function assignProspect(
  prospectId: string,
  userId: string | null,
): Promise<ActionResult<{ done: true }>> {
  const { ctx, error } = await getAuthedOrgClient()
  if (!ctx) return fail(error)
  if (ctx.role !== "admin") return fail("Only admins can assign leads")

  const { data: prospect } = await ctx.supabase
    .from("prospects")
    .select("business_name, platform, handle, assigned_to")
    .eq("id", prospectId)
    .eq("org_id", ctx.orgId)
    .single()

  const { error: dbError } = await ctx.supabase
    .from("prospects")
    .update({ assigned_to: userId })
    .eq("id", prospectId)
    .eq("org_id", ctx.orgId)

  if (dbError) return fail(dbError.message)

  if (userId && userId !== ctx.userId && prospect?.business_name) {
    await createNotification({
      orgId: ctx.orgId,
      userId,
      actorId: ctx.userId,
      type: "prospect_assigned",
      subjectId: prospectId,
      message: `You've been assigned to ${prospect.business_name}`,
    })

    void logActivity({
      orgId: ctx.orgId,
      prospectId,
      userId: ctx.userId,
      action: "assignee_changed",
      oldValue: prospect.assigned_to ?? "Unassigned",
      newValue: userId ?? "Unassigned",
    })

    void sendAssignmentEmail({
      assigneeId: userId,
      actorId: ctx.userId,
      prospect: {
        id: prospectId,
        business_name: prospect.business_name,
        platform: prospect.platform,
        handle: prospect.handle ?? null,
      },
    })
  }

  revalidateProspectViews()
  return ok({ done: true })
}

export type CsvImportRow = {
  business_name: string
  platform: string
  handle?: string
  industry?: string
  location?: string
  website_url?: string
  status?: string
  notes?: string
}

export type ImportResult = {
  imported: number
  errors: { row: number; reason: string }[]
}

function normalizePlatform(raw: string | undefined): string {
  if (!raw) return "other"
  const v = raw.trim().toLowerCase()
  const aliases: Record<string, string> = {
    ig: "instagram", instagram: "instagram",
    fb: "facebook", facebook: "facebook",
    li: "linkedin", linkedin: "linkedin",
    tw: "twitter", twitter: "twitter",
    email: "email", mail: "email",
    other: "other",
  }
  return aliases[v] ?? "other"
}

function normalizeStatus(raw: string | undefined): string {
  if (!raw) return "sent"
  const v = raw.trim().toLowerCase()
  return (PROSPECT_STATUSES as readonly string[]).includes(v) ? v : "sent"
}

export async function importProspects(
  rows: CsvImportRow[],
): Promise<ActionResult<ImportResult>> {
  if (rows.length === 0) return fail("No rows to import")
  if (rows.length > 500) return fail("Maximum 500 rows per import")

  const { ctx, error: orgError } = await getAuthedOrgClient()
  if (!ctx) return fail(orgError)
  if (ctx.role === "viewer") return fail("Insufficient permissions")

  const errors: { row: number; reason: string }[] = []
  const valid: Array<{ org_id: string } & Record<string, unknown>> = []

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i]
    const parsed = prospectCreateSchema.safeParse({
      business_name: raw.business_name,
      platform: normalizePlatform(raw.platform),
      handle: raw.handle || undefined,
      industry: raw.industry || undefined,
      location: raw.location || undefined,
      website_url: raw.website_url || undefined,
      status: normalizeStatus(raw.status),
      notes: raw.notes || undefined,
    })
    if (!parsed.success) {
      errors.push({ row: i + 2, reason: zodErrorMessage(parsed.error) })
    } else {
      valid.push({ ...parsed.data, org_id: ctx.orgId })
    }
  }

  if (valid.length > 0) {
    const CHUNK = 100
    for (let i = 0; i < valid.length; i += CHUNK) {
      const { error: insertError } = await ctx.supabase
        .from("prospects")
        .insert(valid.slice(i, i + CHUNK))
      if (insertError) return fail(insertError.message)
    }
    revalidateProspectViews()
  }

  return ok({ imported: valid.length, errors })
}

export type ExportFilters = {
  status?: string | null
  platform?: string | null
  search?: string
  assignedToMe?: boolean
}

export async function exportProspects(filters: ExportFilters): Promise<ActionResult<string>> {
  const { ctx, error: orgError } = await getAuthedOrgClient()
  if (!ctx) return fail(orgError)

  const { data, error } = await ctx.supabase
    .from("prospects")
    .select("*")
    .eq("org_id", ctx.orgId)
    .order("created_at", { ascending: false })

  if (error) return fail(error.message)

  let rows = (data ?? []) as Prospect[]

  if (filters.status) rows = rows.filter((p) => p.status === filters.status)
  if (filters.platform) rows = rows.filter((p) => p.platform === filters.platform)
  if (filters.assignedToMe) rows = rows.filter((p) => p.assigned_to === ctx.userId)
  if (filters.search) {
    const term = filters.search.trim().toLowerCase()
    rows = rows.filter((p) => {
      const hay = [p.business_name, p.handle, p.industry, p.location, p.notes]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return hay.includes(term)
    })
  }

  const toDate = (v: Date | string | null | undefined) =>
    v ? new Date(v).toISOString().split("T")[0] : null

  const csv = toCsv(
    ["Business name", "Platform", "Handle", "Industry", "Location", "Website", "Status", "Notes", "Follow up", "Last contacted", "Added on"],
    rows.map((p) => [
      p.business_name,
      p.platform,
      p.handle,
      p.industry,
      p.location,
      p.website_url,
      p.status,
      p.notes,
      toDate(p.follow_up_at),
      toDate(p.last_contacted_at),
      toDate(p.created_at),
    ]),
  )

  return ok(csv)
}

export async function getProspectById(
  id: string,
): Promise<ActionResult<ProspectWithDetail | null>> {
  const { supabase, user } = await getAuthedClient()
  if (!user) return fail("Not authenticated")

  const { data, error } = await supabase
    .from("prospects")
    .select(
      `
      *,
      messages (*),
      prospect_tags (
        tag:tags (*)
      )
      `,
    )
    .eq("id", id)
    .maybeSingle()

  if (error) return fail(error.message)
  if (!data) return ok(null)

  type ProspectTagJoin = { tag: Tag | null }
  const { prospect_tags, ...rest } = data as typeof data & {
    prospect_tags: ProspectTagJoin[] | null
  }

  const tags: Tag[] = []
  for (const row of prospect_tags ?? []) {
    if (row.tag) tags.push(row.tag)
  }

  return ok({ ...rest, tags } as ProspectWithDetail)
}
