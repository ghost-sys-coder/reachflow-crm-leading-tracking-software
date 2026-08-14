"use server"

import { randomBytes, randomUUID } from "crypto"
import { revalidatePath } from "next/cache"
import { getAuthedOrgClient } from "@/lib/auth/org"
import { encryptSecret, validateWebhookUrl } from "@/lib/webhooks/security"
import { deliverWebhook } from "@/lib/webhooks/deliver"
import { WEBHOOK_EVENT_TYPES } from "@/lib/webhooks/events"

export type WebhookActionState = { success: boolean; message: string }
const denied = (message = "Only workspace administrators can manage webhooks"): WebhookActionState => ({ success: false, message })

export async function createWebhookEndpoint(_previous: WebhookActionState, form: FormData): Promise<WebhookActionState> {
  const { ctx, error } = await getAuthedOrgClient()
  if (!ctx) return denied(error)
  if (ctx.role !== "admin") return denied()
  if (!process.env.WEBHOOK_ENCRYPTION_KEY) return denied("WEBHOOK_ENCRYPTION_KEY is missing in this production environment")
  const name = String(form.get("name") ?? "").trim()
  if (!name) return denied("Endpoint name is required")
  try {
    const url = await validateWebhookUrl(String(form.get("url") ?? ""))
    const secret = randomBytes(32).toString("hex")
    const subscriptions = form.getAll("events").map(String).filter(event => WEBHOOK_EVENT_TYPES.includes(event as typeof WEBHOOK_EVENT_TYPES[number]))
    const { error: insertError } = await ctx.supabase.from("webhook_endpoints").insert({ org_id: ctx.orgId, name, url, secret_ciphertext: encryptSecret(secret), secret_last_four: secret.slice(-4), subscribed_events: ["test.ping",...subscriptions], created_by: ctx.userId })
    if (insertError) return denied(`Could not create endpoint: ${insertError.message}`)
    revalidatePath("/webhooks")
    return { success: true, message: `${name} was created successfully` }
  } catch (cause) {
    return denied(cause instanceof Error ? cause.message : "Could not validate this webhook URL")
  }
}

export async function updateWebhookSubscriptions(_previous: WebhookActionState, form:FormData):Promise<WebhookActionState>{const{ctx,error}=await getAuthedOrgClient();if(!ctx)return denied(error);if(ctx.role!=="admin")return denied();const events=form.getAll("events").map(String).filter(event=>WEBHOOK_EVENT_TYPES.includes(event as typeof WEBHOOK_EVENT_TYPES[number]));const{error:e}=await ctx.supabase.from("webhook_endpoints").update({subscribed_events:["test.ping",...events],updated_at:new Date().toISOString()}).eq("id",String(form.get("id"))).eq("org_id",ctx.orgId);if(e)return denied(e.message);revalidatePath("/webhooks");return{success:true,message:"Event subscriptions updated"}}

export async function rotateWebhookSecret(_previous:WebhookActionState,form:FormData):Promise<WebhookActionState>{const{ctx,error}=await getAuthedOrgClient();if(!ctx)return denied(error);if(ctx.role!=="admin")return denied();const id=String(form.get("id")),{data:endpoint}=await ctx.supabase.from("webhook_endpoints").select("secret_ciphertext").eq("id",id).eq("org_id",ctx.orgId).maybeSingle();if(!endpoint)return denied("Endpoint not found");const secret=randomBytes(32).toString("hex"),{error:e}=await ctx.supabase.from("webhook_endpoints").update({previous_secret_ciphertext:endpoint.secret_ciphertext,previous_secret_expires_at:new Date(Date.now()+24*3600_000).toISOString(),secret_ciphertext:encryptSecret(secret),secret_last_four:secret.slice(-4),updated_at:new Date().toISOString()}).eq("id",id).eq("org_id",ctx.orgId);if(e)return denied(e.message);revalidatePath("/webhooks");return{success:true,message:`Signing secret rotated. New secret: ${secret} — copy it now; it will not be shown again.`}}

export async function sendTestWebhook(_previous: WebhookActionState, form: FormData): Promise<WebhookActionState> {
  const { ctx, error } = await getAuthedOrgClient(); if (!ctx) return denied(error); if (ctx.role !== "admin") return denied()
  const endpointId = String(form.get("endpoint_id") ?? "")
  const { data: endpoint } = await ctx.supabase.from("webhook_endpoints").select("name").eq("id", endpointId).eq("org_id", ctx.orgId).maybeSingle()
  if (!endpoint) return denied("Webhook endpoint was not found")
  const { data: event, error: eventError } = await ctx.supabase.from("webhook_events").insert({ org_id: ctx.orgId, event_type: "test.ping", payload: { message: "ReachFlow webhook connection test", sent_by: ctx.userId }, idempotency_key: `test:${endpointId}:${randomUUID()}` }).select("id").single()
  if (eventError || !event) return denied(`Could not create test event: ${eventError?.message ?? "Unknown error"}`)
  const { data: delivery, error: deliveryError } = await ctx.supabase.from("webhook_deliveries").insert({ org_id: ctx.orgId, endpoint_id: endpointId, event_id: event.id }).select("id").single()
  if (deliveryError || !delivery) return denied(`Could not create delivery: ${deliveryError?.message ?? "Unknown error"}`)
  await deliverWebhook(delivery.id)
  const { data: result } = await ctx.supabase.from("webhook_deliveries").select("status,last_error").eq("id", delivery.id).single()
  revalidatePath("/webhooks")
  return result?.status === "delivered" ? { success: true, message: `Test delivered to ${endpoint.name}` } : denied(result?.last_error ?? "Test delivery failed")
}

export async function toggleWebhookEndpoint(_previous: WebhookActionState, form: FormData): Promise<WebhookActionState> {
  const { ctx, error } = await getAuthedOrgClient(); if (!ctx) return denied(error); if (ctx.role !== "admin") return denied()
  const active = form.get("active") === "true"
  const { error: updateError } = await ctx.supabase.from("webhook_endpoints").update({ is_active: active, disabled_at: null, updated_at: new Date().toISOString() }).eq("id", String(form.get("id"))).eq("org_id", ctx.orgId)
  if (updateError) return denied(updateError.message)
  revalidatePath("/webhooks"); return { success: true, message: active ? "Endpoint enabled" : "Endpoint disabled" }
}

export async function deleteWebhookEndpoint(_previous: WebhookActionState, form: FormData): Promise<WebhookActionState> {
  const { ctx, error } = await getAuthedOrgClient()
  if (!ctx) return denied(error)
  if (ctx.role !== "admin") return denied()

  const id = String(form.get("id") ?? "")
  if (!id) return denied("Webhook endpoint ID is required")

  const { data: deleted, error: deleteError } = await ctx.supabase
    .from("webhook_endpoints")
    .delete()
    .eq("id", id)
    .eq("org_id", ctx.orgId)
    .select("id")
    .maybeSingle()

  if (deleteError) return denied(`Could not delete endpoint: ${deleteError.message}`)
  if (!deleted) return denied("Webhook endpoint was not found or has already been deleted")

  revalidatePath("/webhooks")
  return { success: true, message: "Webhook endpoint deleted" }
}

export async function retryWebhook(_previous: WebhookActionState, form: FormData): Promise<WebhookActionState> {
  const { ctx, error } = await getAuthedOrgClient(); if (!ctx) return denied(error); if (ctx.role !== "admin") return denied()
  const id = String(form.get("delivery_id"))
  const { error: updateError } = await ctx.supabase.from("webhook_deliveries").update({ status: "pending", next_attempt_at: new Date().toISOString() }).eq("id", id).eq("org_id", ctx.orgId)
  if (updateError) return denied(updateError.message)
  await deliverWebhook(id)
  const { data } = await ctx.supabase.from("webhook_deliveries").select("status,last_error").eq("id",id).single()
  revalidatePath("/webhooks")
  return data?.status === "delivered" ? { success:true,message:"Delivery completed" } : denied(data?.last_error ?? "Retry failed")
}
