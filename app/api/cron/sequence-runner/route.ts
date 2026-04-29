import { createAdminClient } from "@/lib/supabase/admin"
import { createNotification } from "@/app/actions/notifications"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function resolvePlaceholders(
  template: string,
  vars: { business_name: string; handle: string | null; platform: string },
): string {
  return template
    .replace(/\{\{business_name\}\}/g, vars.business_name)
    .replace(/\{\{handle\}\}/g, vars.handle ?? vars.platform)
    .replace(/\{\{platform\}\}/g, vars.platform)
}

export async function GET(request: Request): Promise<Response> {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const admin = createAdminClient()
  const now = new Date().toISOString()
  let processed = 0

  // Fetch all pending steps that are due, joining up to the prospect
  const { data: dueSteps, error } = await admin
    .from("prospect_sequence_steps")
    .select(`
      id,
      prospect_sequence_id,
      step_number,
      step:sequence_steps!step_id(message_type, subject, body_template),
      prospect_sequence:prospect_sequences!prospect_sequence_id(
        org_id,
        prospect_id,
        sequence_id,
        enrolled_by,
        status,
        sequence:sequences!sequence_id(name),
        prospect:prospects!prospect_id(business_name, handle, platform, org_id)
      )
    `)
    .eq("status", "pending")
    .lte("due_at", now)

  if (error) {
    console.error("[sequence-runner] query error:", error.message)
    return Response.json({ error: error.message }, { status: 500 })
  }

  for (const row of dueSteps ?? []) {
    const ps = row.prospect_sequence as unknown as {
      org_id: string
      prospect_id: string
      sequence_id: string
      enrolled_by: string | null
      status: string
      sequence: { name: string } | null
      prospect: { business_name: string; handle: string | null; platform: string; org_id: string } | null
    } | null

    const step = row.step as unknown as {
      message_type: string
      subject: string | null
      body_template: string
    } | null

    // Skip if sequence is no longer active
    if (!ps || ps.status !== "active" || !step || !ps.prospect) continue

    const resolved = resolvePlaceholders(step.body_template, ps.prospect)

    // Create draft message
    const { error: msgErr } = await admin.from("messages").insert({
      org_id:       ps.org_id,
      prospect_id:  ps.prospect_id,
      user_id:      ps.enrolled_by ?? ps.prospect_id, // fallback — won't be null in practice
      message_type: step.message_type,
      content:      resolved,
      subject:      step.subject ?? null,
      was_sent:     false,
    })

    if (msgErr) {
      console.error(`[sequence-runner] message insert error for step ${row.id}:`, msgErr.message)
      continue
    }

    // Mark step as ready
    await admin
      .from("prospect_sequence_steps")
      .update({ status: "ready", completed_at: now })
      .eq("id", row.id)

    // Notify the enrolling user (or admin)
    if (ps.enrolled_by) {
      await createNotification({
        orgId:     ps.org_id,
        userId:    ps.enrolled_by,
        actorId:   ps.enrolled_by,
        type:      "status_changed",
        subjectId: ps.prospect_id,
        message:   `Step ${row.step_number} of "${ps.sequence?.name ?? "sequence"}" is ready for ${ps.prospect.business_name}`,
      })
    }

    processed++
  }

  return Response.json({ processed })
}
