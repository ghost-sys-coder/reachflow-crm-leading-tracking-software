"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { getAuthedOrgClient } from "@/lib/auth/org"
import { fail, ok } from "@/lib/validation/result"
import { MESSAGE_TYPES } from "@/db/schema"
import type {
  ActionResult,
  ProspectSequenceWithDetails,
  Sequence,
  SequenceWithSteps,
} from "@/types/database"

const stepSchema = z.object({
  delay_days:    z.number().int().min(0),
  message_type:  z.enum(MESSAGE_TYPES),
  subject:       z.string().trim().max(200).optional(),
  body_template: z.string().trim().min(1, "Step body is required").max(5000),
})

const sequenceSchema = z.object({
  name:        z.string().trim().min(1, "Name is required").max(100),
  description: z.string().trim().max(500).optional(),
  steps:       z.array(stepSchema).min(1, "At least one step is required").max(10),
})

export type SequenceInput = z.infer<typeof sequenceSchema>

export async function getSequences(): Promise<ActionResult<SequenceWithSteps[]>> {
  const { ctx, error } = await getAuthedOrgClient()
  if (!ctx) return fail(error)

  const { data, error: dbError } = await ctx.supabase
    .from("sequences")
    .select("*, steps:sequence_steps(*)")
    .eq("org_id", ctx.orgId)
    .order("created_at", { ascending: false })

  if (dbError) return fail(dbError.message)
  return ok((data ?? []) as SequenceWithSteps[])
}

export async function createSequence(
  input: SequenceInput,
): Promise<ActionResult<Sequence>> {
  const parsed = sequenceSchema.safeParse(input)
  if (!parsed.success) return fail(parsed.error.issues[0].message)

  const { ctx, error } = await getAuthedOrgClient()
  if (!ctx) return fail(error)
  if (ctx.role === "viewer") return fail("Insufficient permissions")

  const { data: seq, error: seqErr } = await ctx.supabase
    .from("sequences")
    .insert({ org_id: ctx.orgId, name: parsed.data.name, description: parsed.data.description ?? null, created_by: ctx.userId })
    .select()
    .single()

  if (seqErr) return fail(seqErr.message)

  const stepsPayload = parsed.data.steps.map((s, i) => ({
    sequence_id:   (seq as Sequence).id,
    step_number:   i + 1,
    delay_days:    s.delay_days,
    message_type:  s.message_type,
    subject:       s.subject ?? null,
    body_template: s.body_template,
  }))

  const { error: stepsErr } = await ctx.supabase.from("sequence_steps").insert(stepsPayload)
  if (stepsErr) return fail(stepsErr.message)

  revalidatePath("/settings")
  return ok(seq as Sequence)
}

export async function updateSequence(
  id: string,
  input: SequenceInput,
): Promise<ActionResult<Sequence>> {
  const parsed = sequenceSchema.safeParse(input)
  if (!parsed.success) return fail(parsed.error.issues[0].message)

  const { ctx, error } = await getAuthedOrgClient()
  if (!ctx) return fail(error)
  if (ctx.role === "viewer") return fail("Insufficient permissions")

  const { data: seq, error: seqErr } = await ctx.supabase
    .from("sequences")
    .update({ name: parsed.data.name, description: parsed.data.description ?? null, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("org_id", ctx.orgId)
    .select()
    .single()

  if (seqErr) return fail(seqErr.message)

  // Replace steps: delete existing, re-insert
  await ctx.supabase.from("sequence_steps").delete().eq("sequence_id", id)

  const stepsPayload = parsed.data.steps.map((s, i) => ({
    sequence_id:   id,
    step_number:   i + 1,
    delay_days:    s.delay_days,
    message_type:  s.message_type,
    subject:       s.subject ?? null,
    body_template: s.body_template,
  }))

  const { error: stepsErr } = await ctx.supabase.from("sequence_steps").insert(stepsPayload)
  if (stepsErr) return fail(stepsErr.message)

  revalidatePath("/settings")
  return ok(seq as Sequence)
}

export async function deleteSequence(id: string): Promise<ActionResult<{ id: string }>> {
  const { ctx, error } = await getAuthedOrgClient()
  if (!ctx) return fail(error)
  if (ctx.role !== "admin") return fail("Only admins can delete sequences")

  const { error: dbError } = await ctx.supabase
    .from("sequences")
    .delete()
    .eq("id", id)
    .eq("org_id", ctx.orgId)

  if (dbError) return fail(dbError.message)
  revalidatePath("/settings")
  return ok({ id })
}

export async function enrollProspect(
  prospectId: string,
  sequenceId: string,
): Promise<ActionResult<{ done: true }>> {
  const { ctx, error } = await getAuthedOrgClient()
  if (!ctx) return fail(error)
  if (ctx.role === "viewer") return fail("Insufficient permissions")

  // Block if already active
  const { data: existing } = await ctx.supabase
    .from("prospect_sequences")
    .select("id")
    .eq("prospect_id", prospectId)
    .eq("status", "active")
    .maybeSingle()

  if (existing) return fail("This prospect is already enrolled in an active sequence")

  // Fetch steps
  const { data: steps, error: stepsErr } = await ctx.supabase
    .from("sequence_steps")
    .select("id, step_number, delay_days")
    .eq("sequence_id", sequenceId)
    .order("step_number", { ascending: true })

  if (stepsErr) return fail(stepsErr.message)
  if (!steps?.length) return fail("Sequence has no steps")

  const startedAt = new Date()

  const { data: ps, error: psErr } = await ctx.supabase
    .from("prospect_sequences")
    .insert({
      org_id:      ctx.orgId,
      prospect_id: prospectId,
      sequence_id: sequenceId,
      enrolled_by: ctx.userId,
      started_at:  startedAt.toISOString(),
      status:      "active",
    })
    .select()
    .single()

  if (psErr) return fail(psErr.message)

  const stepRows = steps.map((s) => {
    const dueAt = new Date(startedAt)
    dueAt.setDate(dueAt.getDate() + s.delay_days)
    return {
      prospect_sequence_id: (ps as { id: string }).id,
      step_id:              s.id,
      step_number:          s.step_number,
      due_at:               dueAt.toISOString(),
      status:               "pending",
    }
  })

  const { error: pssErr } = await ctx.supabase.from("prospect_sequence_steps").insert(stepRows)
  if (pssErr) return fail(pssErr.message)

  return ok({ done: true })
}

export async function cancelProspectSequence(
  prospectSequenceId: string,
): Promise<ActionResult<{ done: true }>> {
  const { ctx, error } = await getAuthedOrgClient()
  if (!ctx) return fail(error)
  if (ctx.role === "viewer") return fail("Insufficient permissions")

  const { error: psErr } = await ctx.supabase
    .from("prospect_sequences")
    .update({ status: "cancelled" })
    .eq("id", prospectSequenceId)
    .eq("org_id", ctx.orgId)

  if (psErr) return fail(psErr.message)

  await ctx.supabase
    .from("prospect_sequence_steps")
    .update({ status: "skipped", completed_at: new Date().toISOString() })
    .eq("prospect_sequence_id", prospectSequenceId)
    .eq("status", "pending")

  return ok({ done: true })
}

export async function getProspectActiveSequence(
  prospectId: string,
): Promise<ActionResult<ProspectSequenceWithDetails | null>> {
  const { ctx, error } = await getAuthedOrgClient()
  if (!ctx) return fail(error)

  const { data, error: dbError } = await ctx.supabase
    .from("prospect_sequences")
    .select(`
      *,
      sequence:sequences!sequence_id(name, description),
      steps:prospect_sequence_steps(*, step:sequence_steps!step_id(message_type, delay_days, body_template, subject))
    `)
    .eq("prospect_id", prospectId)
    .eq("org_id", ctx.orgId)
    .eq("status", "active")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (dbError) return fail(dbError.message)
  return ok(data as ProspectSequenceWithDetails | null)
}
