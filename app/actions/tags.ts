"use server"

import { revalidatePath } from "next/cache"

import { getAuthedClient } from "@/lib/auth/session"
import { getAuthedOrgClient } from "@/lib/auth/org"
import { fail, ok, zodErrorMessage } from "@/lib/validation/result"
import {
  tagCreateSchema,
  type TagCreateInput,
} from "@/lib/validation/schemas"
import type { ActionResult, ProspectTag, Tag } from "@/types/database"

export async function createTag(input: TagCreateInput): Promise<ActionResult<Tag>> {
  const parsed = tagCreateSchema.safeParse(input)
  if (!parsed.success) return fail(zodErrorMessage(parsed.error))

  const { ctx, error } = await getAuthedOrgClient()
  if (!ctx) return fail(error)

  const { data, error } = await ctx.supabase
    .from("tags")
    .insert({ ...parsed.data, org_id: ctx.orgId })
    .select()
    .single()

  if (error) {
    console.error("Error creating tag:", error)
    return fail(error.message)
  }
  revalidatePath("/prospects", "layout")
  return ok(data as Tag)
}

export async function deleteTag(id: string): Promise<ActionResult<{ id: string }>> {
  const { supabase, user } = await getAuthedClient()
  if (!user) return fail("Not authenticated")

  const { error } = await supabase.from("tags").delete().eq("id", id)
  if (error) return fail(error.message)

  revalidatePath("/prospects", "layout")
  return ok({ id })
}

export async function addTagToProspect(
  prospectId: string,
  tagId: string,
): Promise<ActionResult<ProspectTag>> {
  const { supabase, user } = await getAuthedClient()
  if (!user) return fail("Not authenticated")

  const { data, error } = await supabase
    .from("prospect_tags")
    .insert({ prospect_id: prospectId, tag_id: tagId })
    .select()
    .single()

  if (error) return fail(error.message)
  revalidatePath(`/prospects/${prospectId}`)
  revalidatePath("/pipeline")
  return ok(data as ProspectTag)
}

export async function removeTagFromProspect(
  prospectId: string,
  tagId: string,
): Promise<ActionResult<{ prospect_id: string; tag_id: string }>> {
  const { supabase, user } = await getAuthedClient()
  if (!user) return fail("Not authenticated")

  const { error } = await supabase
    .from("prospect_tags")
    .delete()
    .eq("prospect_id", prospectId)
    .eq("tag_id", tagId)

  if (error) return fail(error.message)
  revalidatePath(`/prospects/${prospectId}`)
  revalidatePath("/pipeline")
  return ok({ prospect_id: prospectId, tag_id: tagId })
}

export async function getUserTags(): Promise<ActionResult<Tag[]>> {
  const { supabase, user } = await getAuthedClient()
  if (!user) return fail("Not authenticated")

  const { data, error } = await supabase
    .from("tags")
    .select("*")
    .order("name", { ascending: true })

  if (error) return fail(error.message)
  return ok((data ?? []) as Tag[])
}
