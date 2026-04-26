"use server"

import { revalidatePath } from "next/cache"

import { getAuthedClient } from "@/lib/auth/session"
import { getAuthedOrgClient } from "@/lib/auth/org"
import { fail, ok, zodErrorMessage } from "@/lib/validation/result"
import {
  messageCreateSchema,
  type MessageCreateInput,
} from "@/lib/validation/schemas"
import type {
  ActionResult,
  Message,
  MessageWithProspect,
} from "@/types/database"

export async function saveMessage(
  input: MessageCreateInput,
): Promise<ActionResult<Message>> {
  const parsed = messageCreateSchema.safeParse(input)
  if (!parsed.success) return fail(zodErrorMessage(parsed.error))

  const { ctx, error } = await getAuthedOrgClient()
  if (!ctx) return fail(error)

  const { data, error: insertError } = await ctx.supabase
    .from("messages")
    .insert({ ...parsed.data, user_id: ctx.userId, org_id: ctx.orgId })
    .select()
    .single()

  if (insertError) return fail(insertError.message)
  revalidatePath("/prospects", "layout")
  return ok(data as Message)
}

export async function markMessageAsSent(id: string): Promise<ActionResult<Message>> {
  const { supabase, user } = await getAuthedClient()
  if (!user) return fail("Not authenticated")

  const { data, error: updateError } = await supabase
    .from("messages")
    .update({ was_sent: true, sent_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single()

  if (updateError) return fail(updateError.message)

  //also bump the parent prospect's last_contacted_at
  if (data) {
    await supabase
      .from("prospects")
      .update({ last_contacted_at: new Date().toISOString() })
      .eq("id", data.prospect_id)
  }

  revalidatePath("/prospects", "layout")
  revalidatePath("/pipeline")
  revalidatePath("/messages")
  return ok(data as Message)
}

export async function getMessagesForProspect(
  prospectId: string,
): Promise<ActionResult<Message[]>> {
  const { supabase, user } = await getAuthedClient()
  if (!user) return fail("Not authenticated")

  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("prospect_id", prospectId)
    .order("created_at", { ascending: false })

  if (error) return fail(error.message)
  return ok((data ?? []) as Message[])
}

export async function getAllMessages(): Promise<
  ActionResult<MessageWithProspect[]>
> {
  const { supabase, user } = await getAuthedClient()
  if (!user) return fail("Not authenticated")

  const { data, error } = await supabase
    .from("messages")
    .select("*, prospect:prospects (*)")
    .order("created_at", { ascending: false })

  if (error) return fail(error.message)
  return ok((data ?? []) as MessageWithProspect[])
}

export async function deleteMessage(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  const { supabase, user } = await getAuthedClient()
  if (!user) return fail("Not authenticated")

  const { error } = await supabase.from("messages").delete().eq("id", id)
  if (error) return fail(error.message)

  revalidatePath("/messages")
  revalidatePath("/prospects", "layout")
  return ok({ id })
}
