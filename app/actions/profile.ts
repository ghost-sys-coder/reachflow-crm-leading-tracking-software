"use server"

import { revalidatePath } from "next/cache"

import { getAuthedClient } from "@/lib/auth/session"
import { getAuthedOrgClient } from "@/lib/auth/org"
import { fail, ok, zodErrorMessage } from "@/lib/validation/result"
import {
  agencyProfileUpdateSchema,
  profileUpdateSchema,
  themeUpdateSchema,
  whiteLabelSchema,
  type AgencyProfileUpdateInput,
  type ProfileUpdateInput,
  type ThemeUpdateInput,
  type WhiteLabelInput,
} from "@/lib/validation/schemas"
import type { ActionResult, Organization, Profile } from "@/types/database"

export async function getCurrentProfile(): Promise<ActionResult<Profile | null>> {
  const { supabase, user } = await getAuthedClient()
  if (!user) return fail("Not authenticated")

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle()

  if (error) return fail(error.message)
  return ok((data ?? null) as Profile | null)
}

export async function getCurrentOrg(): Promise<ActionResult<Organization | null>> {
  const { ctx, error: orgError } = await getAuthedOrgClient()
  if (!ctx) return fail(orgError)

  const { data, error } = await ctx.supabase
    .from("organizations")
    .select("*")
    .eq("id", ctx.orgId)
    .maybeSingle()

  if (error) return fail(error.message)
  return ok((data ?? null) as Organization | null)
}

export async function updateProfile(
  input: ProfileUpdateInput,
): Promise<ActionResult<Profile>> {
  const parsed = profileUpdateSchema.safeParse(input)
  if (!parsed.success) return fail(zodErrorMessage(parsed.error))

  const { supabase, user } = await getAuthedClient()
  if (!user) return fail("Not authenticated")

  const { data, error } = await supabase
    .from("profiles")
    .update(parsed.data)
    .eq("id", user.id)
    .select()
    .single()

  if (error) return fail(error.message)
  revalidatePath("/settings")
  return ok(data as Profile)
}

export async function updateAgencyProfile(
  input: AgencyProfileUpdateInput,
): Promise<ActionResult<Organization>> {
  const parsed = agencyProfileUpdateSchema.safeParse(input)
  if (!parsed.success) return fail(zodErrorMessage(parsed.error))

  const { ctx, error: orgError } = await getAuthedOrgClient()
  if (!ctx) return fail(orgError)
  if (ctx.role !== "admin") return fail("Only org admins can update agency settings")

  //null-out undefined keys so Supabase clears optional fields the user emptied
  const payload: Record<string, unknown> = {
    agency_name: parsed.data.agency_name ?? null,
    sender_name: parsed.data.sender_name ?? null,
    agency_website: parsed.data.agency_website ?? null,
    agency_value_props: parsed.data.agency_value_props ?? null,
    agency_services: parsed.data.agency_services ?? null,
  }

  const { data, error } = await ctx.supabase
    .from("organizations")
    .update(payload)
    .eq("id", ctx.orgId)
    .select()
    .single()

  if (error) return fail(error.message)
  revalidatePath("/settings")
  revalidatePath("/settings/agency")
  revalidatePath("/prospects", "layout")
  return ok(data as Organization)
}

export async function updateProfileAvatar(
  avatarUrl: string | null,
): Promise<ActionResult<Profile>> {
  const { supabase, user } = await getAuthedClient()
  if (!user) return fail("Not authenticated")

  const { data, error } = await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl })
    .eq("id", user.id)
    .select()
    .single()

  if (error) return fail(error.message)
  revalidatePath("/settings")
  return ok(data as Profile)
}

export async function updateOrgLogo(
  logoUrl: string | null,
): Promise<ActionResult<Organization>> {
  const { ctx, error: orgError } = await getAuthedOrgClient()
  if (!ctx) return fail(orgError)
  if (ctx.role !== "admin") return fail("Only admins can update the agency logo")

  const { data, error } = await ctx.supabase
    .from("organizations")
    .update({ logo_url: logoUrl })
    .eq("id", ctx.orgId)
    .select()
    .single()

  if (error) return fail(error.message)
  revalidatePath("/settings")
  return ok(data as Organization)
}

export async function updateDigestPreference(
  enabled: boolean,
): Promise<ActionResult<Profile>> {
  const { supabase, user } = await getAuthedClient()
  if (!user) return fail("Not authenticated")

  const { data, error } = await supabase
    .from("profiles")
    .update({ follow_up_digest: enabled })
    .eq("id", user.id)
    .select()
    .single()

  if (error) return fail(error.message)
  revalidatePath("/settings")
  return ok(data as Profile)
}

export async function updateWhiteLabelSettings(
  input: WhiteLabelInput,
): Promise<ActionResult<Organization>> {
  const parsed = whiteLabelSchema.safeParse(input)
  if (!parsed.success) return fail(zodErrorMessage(parsed.error))

  const { ctx, error: orgError } = await getAuthedOrgClient()
  if (!ctx) return fail(orgError)
  if (ctx.role !== "admin") return fail("Only org admins can update white-label settings")

  const payload = {
    white_label_enabled: parsed.data.white_label_enabled,
    brand_primary_color: parsed.data.brand_primary_color ?? null,
    brand_accent_color: parsed.data.brand_accent_color ?? null,
  }

  const { data, error } = await ctx.supabase
    .from("organizations")
    .update(payload)
    .eq("id", ctx.orgId)
    .select()
    .single()

  if (error) return fail(error.message)
  revalidatePath("/settings")
  return ok(data as Organization)
}

export async function updateThemePreference(
  input: ThemeUpdateInput,
): Promise<ActionResult<Profile>> {
  const parsed = themeUpdateSchema.safeParse(input)
  if (!parsed.success) return fail(zodErrorMessage(parsed.error))

  const { supabase, user } = await getAuthedClient()
  if (!user) return fail("Not authenticated")

  const { data, error } = await supabase
    .from("profiles")
    .update({ theme_preference: parsed.data.theme_preference })
    .eq("id", user.id)
    .select()
    .single()

  if (error) return fail(error.message)
  revalidatePath("/settings")
  return ok(data as Profile)
}
