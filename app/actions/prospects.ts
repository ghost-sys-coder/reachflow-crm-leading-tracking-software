"use server"

import { revalidatePath } from "next/cache"

import { getAuthedClient } from "@/lib/auth/session"
import { getAuthedOrgClient } from "@/lib/auth/org"
import type { OrgContext } from "@/lib/auth/org"
import { createAdminClient } from "@/lib/supabase/admin"
import { toCsv } from "@/lib/csv/generate"
import { normalizeCountry } from "@/lib/constants/countries"
import { sendMail } from "@/lib/email/mailer"
import { prospectAssignedEmailHtml } from "@/lib/email/templates/prospect-assigned"
import { fail, ok, zodErrorMessage } from "@/lib/validation/result"
import { createNotification } from "@/app/actions/notifications"
import { logActivity } from "@/lib/activity/log"
import { recalculateProspectScore } from "@/lib/scoring/calculate"
import { runAutomations } from "@/lib/automation/engine"
import { publishWebhookEvent } from "@/lib/webhooks/publish"
import { createAdminClient as _adminClient } from "@/lib/supabase/admin"
import {
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
  revalidatePath("/campaigns", "layout")
}

async function validateCampaignIds(
  campaignIds: string[],
  orgId: string,
  supabase: OrgContext["supabase"],
) {
  const uniqueIds = [...new Set(campaignIds)]
  if (!uniqueIds.length) return { ids: uniqueIds, error: null }
  const { data, error } = await supabase
    .from("campaigns")
    .select("id")
    .in("id", uniqueIds)
    .eq("org_id", orgId)
  if (error) return { ids: uniqueIds, error: error.message }
  if ((data ?? []).length !== uniqueIds.length) {
    return { ids: uniqueIds, error: "One or more selected campaigns are unavailable" }
  }
  return { ids: uniqueIds, error: null }
}

export async function createProspect(
  input: ProspectCreateInput,
): Promise<ActionResult<Prospect>> {
  const parsed = prospectCreateSchema.safeParse(input)
  if (!parsed.success) return fail(zodErrorMessage(parsed.error))

  const { ctx, error: orgError } = await getAuthedOrgClient()
  if (!ctx) return fail(orgError)
  if (ctx.role === "viewer") return fail("Insufficient permissions")

  const { campaign_ids = [], initial_message, ...prospectData } = parsed.data
  const campaignCheck = await validateCampaignIds(campaign_ids, ctx.orgId, ctx.supabase)
  if (campaignCheck.error) return fail(campaignCheck.error)

  const { data, error: insertError } = await ctx.supabase
    .from("prospects")
    .insert({ ...prospectData, org_id: ctx.orgId })
    .select()
    .single()

  if (insertError) return fail(insertError.message)
  if (campaignCheck.ids.length) {
    const { error: membershipError } = await ctx.supabase.from("campaign_prospects").insert(
      campaignCheck.ids.map((campaignId) => ({
        campaign_id: campaignId,
        prospect_id: (data as Prospect).id,
        added_by: ctx.userId,
      })),
    )
    if (membershipError) {
      await ctx.supabase.from("prospects").delete().eq("id", (data as Prospect).id)
      return fail(membershipError.message)
    }
  }
  if (initial_message) {
    const sentAt = new Date().toISOString()
    const messageType = messageTypeForPlatform(prospectData.platform)
    const { error: messageError } = await ctx.supabase.from("messages").insert({
      org_id: ctx.orgId,
      prospect_id: (data as Prospect).id,
      user_id: ctx.userId,
      message_type: messageType,
      content: initial_message,
      was_sent: true,
      sent_at: sentAt,
    })
    if (messageError) {
      await ctx.supabase.from("prospects").delete().eq("id", (data as Prospect).id)
      return fail(messageError.message)
    }
    await ctx.supabase.from("prospects").update({ last_contacted_at: sentAt }).eq("id", (data as Prospect).id)
    void logActivity({ orgId: ctx.orgId, prospectId: (data as Prospect).id, userId: ctx.userId, action: "outreach_sent", newValue: messageType })
  }
  void logActivity({
    orgId: ctx.orgId,
    prospectId: (data as Prospect).id,
    userId: ctx.userId,
    action: "prospect_created",
    newValue: (data as Prospect).business_name,
  })
  await recalculateProspectScore(ctx, (data as Prospect).id)
  await runAutomations(ctx, "prospect_created", (data as Prospect).id, `prospect_created:${(data as Prospect).id}`)
  await publishWebhookEvent(ctx,"prospect.created",(data as Prospect).id,{prospect:{id:(data as Prospect).id,business_name:(data as Prospect).business_name,platform:(data as Prospect).platform,status:(data as Prospect).status,industry:(data as Prospect).industry,location:(data as Prospect).location}},`prospect.created:${(data as Prospect).id}`)
  revalidateProspectViews()
  return ok(data as Prospect)
}

function messageTypeForPlatform(platform: string) {
  return ({
    instagram: "instagram_dm",
    email: "cold_email",
    facebook: "facebook_message",
    linkedin: "linkedin_message",
    x: "x_message",
    call: "call_note",
  } as Record<string, string>)[platform] ?? "custom"
}

export async function updateProspect(
  id: string,
  input: ProspectUpdateInput,
): Promise<ActionResult<Prospect>> {
  const parsed = prospectUpdateSchema.safeParse(input)
  if (!parsed.success) return fail(zodErrorMessage(parsed.error))

  const { ctx, error: orgError } = await getAuthedOrgClient()
  if (!ctx) return fail(orgError)
  if (ctx.role === "viewer") return fail("Insufficient permissions")

  const { campaign_ids, ...prospectData } = parsed.data
  const campaignCheck = campaign_ids
    ? await validateCampaignIds(campaign_ids, ctx.orgId, ctx.supabase)
    : null
  if (campaignCheck?.error) return fail(campaignCheck.error)

  const { data, error } = await ctx.supabase
    .from("prospects")
    .update(prospectData)
    .eq("id", id)
    .eq("org_id", ctx.orgId)
    .select()
    .single()

  if (error) return fail(error.message)
  if (campaignCheck) {
    if (campaignCheck.ids.length) {
      const { error: addError } = await ctx.supabase.from("campaign_prospects").upsert(
        campaignCheck.ids.map((campaignId) => ({
          campaign_id: campaignId,
          prospect_id: id,
          added_by: ctx.userId,
        })),
        { onConflict: "campaign_id,prospect_id", ignoreDuplicates: true },
      )
      if (addError) return fail(addError.message)
    }

    let removeQuery = ctx.supabase.from("campaign_prospects").delete().eq("prospect_id", id)
    if (campaignCheck.ids.length) removeQuery = removeQuery.not("campaign_id", "in", `(${campaignCheck.ids.join(",")})`)
    const { error: removeError } = await removeQuery
    if (removeError) return fail(removeError.message)
  }

  const updatedKeys = Object.keys(prospectData)
  const isNotesOnly = updatedKeys.length === 1 && updatedKeys[0] === "notes"
  void logActivity({
    orgId: (data as Prospect).org_id,
    prospectId: id,
    userId: ctx.userId,
    action: isNotesOnly ? "note_updated" : "prospect_updated",
  })
  await recalculateProspectScore(ctx, id)
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
  await recalculateProspectScore(ctx, id)
  await runAutomations(ctx, "status_changed", id, `status_changed:${id}:${parsed.data.status}:${Date.now()}`)
  await publishWebhookEvent(ctx,"prospect.status_changed",id,{prospect:{id,business_name:(data as Prospect).business_name,status:(data as Prospect).status},previous_status:before?.status??null},`prospect.status_changed:${id}:${(data as Prospect).updated_at}`)
  if(parsed.data.status==="booked")await publishWebhookEvent(ctx,"meeting.booked",id,{prospect:{id,business_name:(data as Prospect).business_name},booked_at:new Date().toISOString()},`meeting.booked:${id}:${(data as Prospect).updated_at}`)

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

export async function bulkDeleteProspects(ids: string[]): Promise<ActionResult<{ count: number }>> {
  if (!ids.length) return fail("No prospects selected")

  const { ctx, error } = await getAuthedOrgClient()
  if (!ctx) return fail(error)
  if (ctx.role !== "admin") return fail("Only admins can bulk delete")

  const { error: dbError, count } = await ctx.supabase
    .from("prospects")
    .delete({ count: "exact" })
    .in("id", ids)
    .eq("org_id", ctx.orgId)

  if (dbError) return fail(dbError.message)

  revalidateProspectViews()
  return ok({ count: count ?? ids.length })
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
  orgId: string
  prospect: { id: string; business_name: string; platform: string; handle: string | null }
}) {
  try {
    const admin = createAdminClient()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ""

    const [{ data: assigneeAuth }, { data: actorAuth }, assigneeProfile, actorProfile, orgData] =
      await Promise.all([
        admin.auth.admin.getUserById(params.assigneeId),
        admin.auth.admin.getUserById(params.actorId),
        admin.from("profiles").select("full_name").eq("id", params.assigneeId).single(),
        admin.from("profiles").select("full_name").eq("id", params.actorId).single(),
        admin.from("organizations").select("white_label_enabled, agency_name, brand_primary_color").eq("id", params.orgId).single(),
      ])

    const toEmail = assigneeAuth?.user?.email
    if (!toEmail) return

    const recipientName = assigneeProfile.data?.full_name ?? toEmail.split("@")[0]
    const actorName = actorProfile.data?.full_name ?? actorAuth?.user?.email?.split("@")[0] ?? "A team member"
    const whiteLabelEnabled = orgData.data?.white_label_enabled ?? false
    const brandName = whiteLabelEnabled ? (orgData.data?.agency_name ?? undefined) : undefined
    const primaryColor = whiteLabelEnabled ? (orgData.data?.brand_primary_color ?? undefined) : undefined

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
        brandName,
        primaryColor,
      }),
      fromName: brandName,
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
      orgId: ctx.orgId,
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
  state?: string
  country?: string
  website_url?: string
  status?: string
  notes?: string
}

export type ImportResult = {
  batchId: string
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
    tw: "x", twitter: "x", x: "x",
    call: "call", phone: "call",
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
  metadata?: { filename?: string; mapping?: Record<string, string> },
): Promise<ActionResult<ImportResult>> {
  if (rows.length === 0) return fail("No rows to import")
  if (rows.length > 500) return fail("Maximum 500 rows per import")

  const { ctx, error: orgError } = await getAuthedOrgClient()
  if (!ctx) return fail(orgError)
  if (ctx.role === "viewer") return fail("Insufficient permissions")

  const errors: { row: number; reason: string }[] = []
  const valid: Array<{ rowNumber: number; payload: { org_id: string } & Record<string, unknown> }> = []

  const { data: batch, error: batchError } = await ctx.supabase.from("import_batches").insert({ org_id: ctx.orgId, created_by: ctx.userId, filename: metadata?.filename?.slice(0, 255) || "prospects.csv", mapping: metadata?.mapping ?? {}, total_rows: rows.length }).select().single()
  if (batchError) return fail(batchError.message)

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i]
    const parsed = prospectCreateSchema.safeParse({
      business_name: raw.business_name,
      platform: normalizePlatform(raw.platform),
      handle: raw.handle || undefined,
      industry: raw.industry || undefined,
      location: raw.location || undefined,
      state: raw.state || undefined,
      country: normalizeCountry(raw.country),
      website_url: raw.website_url || undefined,
      status: normalizeStatus(raw.status),
      notes: raw.notes || undefined,
    })
    if (!parsed.success) {
      errors.push({ row: i + 2, reason: zodErrorMessage(parsed.error) })
    } else {
      valid.push({ rowNumber: i + 2, payload: { ...parsed.data, org_id: ctx.orgId } })
    }
  }

  if (valid.length > 0) {
    const CHUNK = 100
    for (let i = 0; i < valid.length; i += CHUNK) {
      const { data: insertData, error: insertError } = await ctx.supabase
        .from("prospects")
        .insert(valid.slice(i, i + CHUNK).map((item) => item.payload))
        .select()
      if (insertError) { await ctx.supabase.from("import_batches").update({ status: "failed", errors: [...errors, { row: i + 2, reason: insertError.message }] }).eq("id", batch.id); return fail(insertError.message) }
      const chunk = valid.slice(i, i + CHUNK)
      const inserted = insertData ?? []
      const { error: ledgerError } = await ctx.supabase.from("import_batch_rows").insert(inserted.map((prospect, index) => ({ import_batch_id: batch.id, prospect_id: prospect.id, row_number: chunk[index].rowNumber, operation: "created", snapshot_after: prospect })))
      if (ledgerError) return fail(ledgerError.message)
    }
    revalidateProspectViews()
  }

  await ctx.supabase.from("import_batches").update({ imported_rows: valid.length, failed_rows: errors.length, errors, status: "completed", completed_at: new Date().toISOString() }).eq("id", batch.id)
  return ok({ batchId: batch.id, imported: valid.length, errors })
}

export async function getImportBatches(): Promise<ActionResult<import("@/types/database").ImportBatch[]>> {
  const { ctx, error } = await getAuthedOrgClient(); if (!ctx) return fail(error)
  const { data, error: dbError } = await ctx.supabase.from("import_batches").select("*").eq("org_id", ctx.orgId).order("created_at", { ascending: false })
  return dbError ? fail(dbError.message) : ok((data ?? []) as import("@/types/database").ImportBatch[])
}

export async function rollbackImportBatch(batchId: string): Promise<ActionResult<{ deleted: number }>> {
  const { ctx, error } = await getAuthedOrgClient(); if (!ctx) return fail(error); if (ctx.role !== "admin") return fail("Only admins can roll back imports")
  const { data: batch, error: batchError } = await ctx.supabase.from("import_batches").select("*").eq("id", batchId).eq("org_id", ctx.orgId).eq("status", "completed").single()
  if (batchError) return fail(batchError.message)
  const { data: rows, error: rowsError } = await ctx.supabase.from("import_batch_rows").select("prospect_id, snapshot_after").eq("import_batch_id", batch.id).eq("operation", "created")
  if (rowsError) return fail(rowsError.message)
  let deleted = 0
  for (const row of rows ?? []) {
    if (!row.prospect_id) continue
    const snapshot = row.snapshot_after as { updated_at?: string } | null
    const { data: current } = await ctx.supabase.from("prospects").select("updated_at").eq("id", row.prospect_id).eq("org_id", ctx.orgId).maybeSingle()
    if (!current || !snapshot?.updated_at || new Date(current.updated_at).getTime() !== new Date(snapshot.updated_at).getTime()) continue
    const { error: deleteError } = await ctx.supabase.from("prospects").delete().eq("id", row.prospect_id).eq("org_id", ctx.orgId)
    if (!deleteError) deleted++
  }
  await ctx.supabase.from("import_batches").update({ status: "rolled_back", rolled_back_at: new Date().toISOString(), rolled_back_by: ctx.userId }).eq("id", batch.id)
  revalidateProspectViews(); revalidatePath("/imports"); return ok({ deleted })
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
    ["Business name", "Platform", "Handle", "Industry", "Country", "State", "Location", "Website", "Status", "Notes", "Follow up", "Last contacted", "Added on"],
    rows.map((p) => [
      p.business_name,
      p.platform,
      p.handle,
      p.industry,
      p.country,
      p.state,
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
      ),
      campaign_prospects (
        campaign:campaigns (id, name, status)
      )
      `,
    )
    .eq("id", id)
    .maybeSingle()

  if (error) return fail(error.message)
  if (!data) return ok(null)

  type ProspectTagJoin = { tag: Tag | null }
  const { prospect_tags, campaign_prospects, ...rest } = data as typeof data & {
    prospect_tags: ProspectTagJoin[] | null
    campaign_prospects: Array<{
      campaign: { id: string; name: string; status: string } | null
    }> | null
  }

  const tags: Tag[] = []
  for (const row of prospect_tags ?? []) {
    if (row.tag) tags.push(row.tag)
  }

  const campaigns = (campaign_prospects ?? [])
    .map((row: { campaign: { id: string; name: string; status: string } | null }) => row.campaign)
    .filter(Boolean) as Array<{ id: string; name: string; status: string }>

  return ok({ ...rest, tags, campaigns } as ProspectWithDetail)
}
