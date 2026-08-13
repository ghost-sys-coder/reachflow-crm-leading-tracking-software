"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { getAuthedClient } from "@/lib/auth/session"
import { isRoadmapAuthorizedUser } from "@/lib/roadmap/access"
import { ROADMAP_FEATURE_KEYS } from "@/lib/roadmap/catalog"
import { fail, ok, zodErrorMessage } from "@/lib/validation/result"
import type { ActionResult, RoadmapFeatureProgress } from "@/types/database"

const featureKeySchema = z.enum(ROADMAP_FEATURE_KEYS as [string, ...string[]])
const notesSchema = z.string().max(20_000, "Implementation notes must be 20,000 characters or fewer")

async function getAuthorizedRoadmapContext() {
  const { supabase, user } = await getAuthedClient()
  if (!user) return { ctx: null, error: "Not authenticated" }
  if (!isRoadmapAuthorizedUser(user)) return { ctx: null, error: "Roadmap access is restricted" }
  return { ctx: { supabase, user, email: user.email!.trim().toLowerCase() }, error: null }
}

export async function getRoadmapProgress(): Promise<ActionResult<RoadmapFeatureProgress[]>> {
  const { ctx, error } = await getAuthorizedRoadmapContext()
  if (!ctx) return fail(error)

  const { data, error: queryError } = await ctx.supabase
    .from("roadmap_feature_progress")
    .select("*")
    .order("created_at", { ascending: true })

  if (queryError) return fail(queryError.message)
  return ok((data ?? []) as RoadmapFeatureProgress[])
}

export async function updateRoadmapNotes(
  featureKey: string,
  notes: string,
): Promise<ActionResult<RoadmapFeatureProgress>> {
  const parsedKey = featureKeySchema.safeParse(featureKey)
  const parsedNotes = notesSchema.safeParse(notes)
  if (!parsedKey.success) return fail(zodErrorMessage(parsedKey.error))
  if (!parsedNotes.success) return fail(zodErrorMessage(parsedNotes.error))

  const { ctx, error } = await getAuthorizedRoadmapContext()
  if (!ctx) return fail(error)
  const now = new Date().toISOString()
  const { data, error: updateError } = await ctx.supabase
    .from("roadmap_feature_progress")
    .upsert({
      feature_key: parsedKey.data,
      implementation_notes: parsedNotes.data,
      notes_updated_at: now,
      notes_updated_by: ctx.user.id,
      notes_updated_by_email: ctx.email,
      updated_at: now,
    }, { onConflict: "feature_key" })
    .select()
    .single()

  if (updateError) return fail(updateError.message)
  revalidatePath("/roadmap")
  return ok(data as RoadmapFeatureProgress)
}

export async function setRoadmapFeatureCompletion(
  featureKey: string,
  isCompleted: boolean,
): Promise<ActionResult<RoadmapFeatureProgress>> {
  const parsedKey = featureKeySchema.safeParse(featureKey)
  if (!parsedKey.success) return fail(zodErrorMessage(parsedKey.error))

  const { ctx, error } = await getAuthorizedRoadmapContext()
  if (!ctx) return fail(error)
  const now = new Date().toISOString()
  const { data, error: updateError } = await ctx.supabase
    .from("roadmap_feature_progress")
    .upsert({
      feature_key: parsedKey.data,
      is_completed: isCompleted,
      completed_at: isCompleted ? now : null,
      completed_by: isCompleted ? ctx.user.id : null,
      completed_by_email: isCompleted ? ctx.email : null,
      updated_at: now,
    }, { onConflict: "feature_key" })
    .select()
    .single()

  if (updateError) return fail(updateError.message)
  revalidatePath("/roadmap")
  return ok(data as RoadmapFeatureProgress)
}
