"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { getAuthedOrgClient } from "@/lib/auth/org";
import { canonicalFieldMappings, HOSTED_FORM_FIELDS, type HostedFormField } from "@/lib/forms/fields";

export type HostedFormActionState = { success: boolean; message: string };
const fail = (message: string): HostedFormActionState => ({ success: false, message });

function slugify(value: string) {
  const base = value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 52);
  return `${base || "form"}-${randomBytes(3).toString("hex")}`;
}

export async function createHostedForm(
  _previous: HostedFormActionState,
  form: FormData,
): Promise<HostedFormActionState> {
  const { ctx, error } = await getAuthedOrgClient();
  if (!ctx) return fail(error);
  if (ctx.role !== "admin") return fail("Only workspace administrators can create forms");

  const name = String(form.get("name") ?? "").trim();
  const title = String(form.get("title") ?? "").trim();
  const description = String(form.get("description") ?? "").trim().slice(0, 500);
  const consentText = String(form.get("consent_text") ?? "").trim();
  const platform = String(form.get("platform") ?? "other");
  const publishNow = form.get("publish_now") === "on";
  if (!name || name.length > 100) return fail("Internal form name is required and must be 100 characters or fewer");
  if (!title || title.length > 120) return fail("Public form title is required and must be 120 characters or fewer");
  if (!consentText || consentText.length > 500) return fail("Consent text is required and must be 500 characters or fewer");

  const fields = HOSTED_FORM_FIELDS.filter(
    (field) => field.name === "business_name" || form.get(`include_${field.name}`) === "on",
  ).map((field) => ({
    ...field,
    required: field.name === "business_name" || form.get(`require_${field.name}`) === "on",
  })) as HostedFormField[];

  const { data: source, error: sourceError } = await ctx.supabase.from("lead_sources").insert({
    org_id: ctx.orgId,
    name: `Form: ${name}`,
    source_type: "hosted_form",
    is_active: publishNow,
    field_mappings: canonicalFieldMappings(),
    default_values: { platform, status: "sent" },
    created_by: ctx.userId,
  }).select("id").single();
  if (sourceError || !source) return fail(`Could not create form source: ${sourceError?.message ?? "Unknown error"}`);

  const { error: formError } = await ctx.supabase.from("hosted_forms").insert({
    org_id: ctx.orgId,
    source_id: source.id,
    name,
    slug: slugify(name),
    status: publishNow ? "active" : "draft",
    title,
    description: description || null,
    fields,
    require_consent: true,
    consent_text: consentText,
    submit_label: String(form.get("submit_label") ?? "Submit").trim().slice(0, 40) || "Submit",
    success_message: String(form.get("success_message") ?? "Thank you. We have received your details.").trim().slice(0, 300),
    created_by: ctx.userId,
  });
  if (formError) {
    await ctx.supabase.from("lead_sources").delete().eq("id", source.id).eq("org_id", ctx.orgId);
    return fail(`Could not create form: ${formError.message}`);
  }
  revalidatePath("/forms");
  return { success: true, message: `${name} created` };
}

export async function setHostedFormStatus(
  _previous: HostedFormActionState,
  form: FormData,
): Promise<HostedFormActionState> {
  const { ctx, error } = await getAuthedOrgClient();
  if (!ctx) return fail(error);
  if (ctx.role !== "admin") return fail("Only workspace administrators can manage forms");
  const status = String(form.get("status"));
  if (!["draft", "active", "archived"].includes(status)) return fail("Invalid form status");
  const id = String(form.get("id"));
  const { data, error: updateError } = await ctx.supabase.from("hosted_forms")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id).eq("org_id", ctx.orgId).select("source_id").maybeSingle();
  if (updateError || !data) return fail(updateError?.message ?? "Form not found");
  await ctx.supabase.from("lead_sources").update({ is_active: status === "active", updated_at: new Date().toISOString() }).eq("id", data.source_id).eq("org_id", ctx.orgId);
  revalidatePath("/forms");
  return { success: true, message: status === "active" ? "Form published" : status === "draft" ? "Form moved to draft" : "Form archived" };
}

export async function deleteHostedForm(
  _previous: HostedFormActionState,
  form: FormData,
): Promise<HostedFormActionState> {
  const { ctx, error } = await getAuthedOrgClient();
  if (!ctx) return fail(error);
  if (ctx.role !== "admin") return fail("Only workspace administrators can delete forms");
  const { data } = await ctx.supabase.from("hosted_forms").select("source_id").eq("id", String(form.get("id"))).eq("org_id", ctx.orgId).maybeSingle();
  if (!data) return fail("Form not found");
  const { error: deleteError } = await ctx.supabase.from("lead_sources").delete().eq("id", data.source_id).eq("org_id", ctx.orgId);
  if (deleteError) return fail(deleteError.message);
  revalidatePath("/forms");
  return { success: true, message: "Form and its submission history deleted" };
}
