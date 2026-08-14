import { Webhook } from "lucide-react"
import { getAuthedOrgClient } from "@/lib/auth/org"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  CreateEndpointForm,
  DeleteEndpointForm,
  RetryDeliveryForm,
  RotateSecretForm,
  SubscriptionForm,
  TestEndpointForm,
  ToggleEndpointForm,
} from "@/components/webhooks/webhook-action-forms"

export default async function WebhooksPage() {
  const { ctx } = await getAuthedOrgClient()
  if (!ctx) return null

  const [{ data: endpoints }, { data: deliveries }] = await Promise.all([
    ctx.supabase
      .from("webhook_endpoints")
      .select("id,name,url,is_active,failure_count,last_success_at,last_failure_at,created_at,subscribed_events,secret_last_four")
      .eq("org_id", ctx.orgId)
      .order("created_at", { ascending: false }),
    ctx.supabase
      .from("webhook_deliveries")
      .select("id,status,attempt_count,last_error,created_at,webhook_endpoints(name),webhook_events(event_type),webhook_delivery_attempts(response_code,duration_ms,error,attempted_at)")
      .eq("org_id", ctx.orgId)
      .order("created_at", { ascending: false })
      .limit(50),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold"><Webhook />Webhook delivery center</h1>
        <p className="text-muted-foreground">Signed HTTPS delivery, health, bounded response diagnostics, and guarded retries.</p>
      </div>

      {!process.env.WEBHOOK_ENCRYPTION_KEY && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-800">
          Set WEBHOOK_ENCRYPTION_KEY before creating endpoints. Use a long random production secret and never expose it to the browser.
        </div>
      )}

      {ctx.role === "admin" && (
        <Card>
          <CardHeader><CardTitle>Add endpoint</CardTitle></CardHeader>
          <CardContent>
            <CreateEndpointForm />
            <p className="mt-2 text-xs text-muted-foreground">HTTPS only. Private networks, credentials in URLs, redirects, and non-standard ports are rejected.</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        {endpoints?.map(endpoint => (
          <Card key={endpoint.id}>
            <CardHeader>
              <CardTitle className="flex justify-between">
                <span>{endpoint.name}</span>
                <span className={endpoint.is_active ? "text-emerald-600" : "text-muted-foreground"}>{endpoint.is_active ? "Active" : "Inactive"}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="truncate text-sm text-muted-foreground">{endpoint.url}</p>
              <p className="text-xs">Failures: {endpoint.failure_count} · Last success: {endpoint.last_success_at ? new Date(endpoint.last_success_at).toLocaleString() : "Never"}</p>
              {ctx.role === "admin" && (
                <div className="flex flex-wrap gap-2">
                  <TestEndpointForm id={endpoint.id} />
                  <ToggleEndpointForm id={endpoint.id} active={endpoint.is_active} />
                  <RotateSecretForm id={endpoint.id} />
                  <DeleteEndpointForm id={endpoint.id} name={endpoint.name} />
                </div>
              )}
              <SubscriptionForm id={endpoint.id} selected={endpoint.subscribed_events ?? []} />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Delivery ledger</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {deliveries?.map(delivery => (
            <div key={delivery.id} className="grid gap-2 rounded-lg border p-3 md:grid-cols-[1fr_auto_auto]">
              <div>
                <b>{delivery.webhook_events?.[0]?.event_type}</b>
                <p className="text-xs text-muted-foreground">{delivery.webhook_endpoints?.[0]?.name} · {new Date(delivery.created_at).toLocaleString()}</p>
                {delivery.last_error && <p className="mt-1 text-xs text-destructive">{delivery.last_error}</p>}
              </div>
              <span className="text-sm font-medium">{delivery.status} · {delivery.attempt_count} attempts</span>
              {ctx.role === "admin" && delivery.status !== "delivered" && <RetryDeliveryForm id={delivery.id} />}
            </div>
          ))}
          {!deliveries?.length && <p className="py-8 text-center text-muted-foreground">No deliveries yet.</p>}
        </CardContent>
      </Card>
    </div>
  )
}
