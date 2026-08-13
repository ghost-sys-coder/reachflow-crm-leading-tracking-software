import { CircleDollarSign } from "lucide-react";
import { createDeal, moveDeal } from "@/app/actions/revenue";
import { getAuthedOrgClient } from "@/lib/auth/org";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const DEAL_CURRENCIES = [
  ["USD", "US Dollar"],
  ["UGX", "Ugandan Shilling"],
  ["KES", "Kenyan Shilling"],
  ["TZS", "Tanzanian Shilling"],
  ["RWF", "Rwandan Franc"],
  ["GBP", "British Pound"],
  ["EUR", "Euro"],
  ["CAD", "Canadian Dollar"],
  ["AUD", "Australian Dollar"],
  ["ZAR", "South African Rand"],
] as const;

export default async function DealsPage() {
  const { ctx } = await getAuthedOrgClient();
  if (!ctx) return null;
  const [{ data: deals }, { data: stages }, { data: prospects }] =
    await Promise.all([
      ctx.supabase
        .from("deals")
        .select("*,prospects(business_name),deal_stages(name)")
        .eq("org_id", ctx.orgId)
        .order("created_at", { ascending: false }),
      ctx.supabase
        .from("deal_stages")
        .select("*")
        .eq("org_id", ctx.orgId)
        .order("position"),
      ctx.supabase
        .from("prospects")
        .select("id,business_name")
        .eq("org_id", ctx.orgId)
        .order("business_name"),
    ]);
  const byCurrency = new Map<
    string,
    { pipeline: number; weighted: number; won: number }
  >();
  for (const d of deals ?? []) {
    const x = byCurrency.get(d.currency) ?? {
      pipeline: 0,
      weighted: 0,
      won: 0,
    };
    x.pipeline += Number(d.value_cents);
    x.weighted += (Number(d.value_cents) * d.probability) / 100;
    if (d.won_at) x.won += Number(d.value_cents);
    byCurrency.set(d.currency, x);
  }
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Deals & revenue</h1>
        <p className="text-muted-foreground">
          Forecast commercial outcomes without mixing currencies.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {[...byCurrency].flatMap(([c, v]) =>
          [
            ["Pipeline", v.pipeline],
            ["Weighted forecast", v.weighted],
            ["Won", v.won],
          ].map(([label, n]) => (
            <Card key={`${c}${label}`}>
              <CardContent className="pt-1">
                <p className="text-xs text-muted-foreground">
                  {label} · {c}
                </p>
                <p className="text-xl font-semibold">
                  {new Intl.NumberFormat(undefined, {
                    style: "currency",
                    currency: c,
                  }).format(Number(n) / 100)}
                </p>
              </CardContent>
            </Card>
          )),
        )}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Create deal</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createDeal} className="grid gap-3 md:grid-cols-6">
            <select
              name="prospect_id"
              required
              className="h-8 rounded-lg border bg-background px-2"
            >
              <option value="">Prospect</option>
              {prospects?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.business_name}
                </option>
              ))}
            </select>
            <Input name="name" placeholder="Deal name" required />
            <Input name="service" placeholder="Service" />
            <Input
              name="value"
              type="number"
              min="0"
              step="0.01"
              placeholder="Value"
              required
            />
            <select
              name="currency"
              defaultValue="USD"
              required
              aria-label="Deal currency"
              className="h-8 rounded-lg border bg-background px-2 text-sm"
            >
              {DEAL_CURRENCIES.map(([code, label]) => (
                <option key={code} value={code}>
                  {code} — {label}
                </option>
              ))}
            </select>
            <select
              name="stage_id"
              required
              className="h-8 rounded-lg border bg-background px-2"
            >
              {stages?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <Input name="expected_close_at" type="date" />
            <Button type="submit">
              <CircleDollarSign />
              Create deal
            </Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Deal pipeline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {deals?.map((d) => (
            <div
              key={d.id}
              className="grid items-center gap-3 rounded-lg border p-3 md:grid-cols-[1fr_1fr_1fr_2fr]"
            >
              <div>
                <b>{d.name}</b>
                <p className="text-xs text-muted-foreground">
                  {d.prospects?.business_name}
                </p>
              </div>
              <span>
                {new Intl.NumberFormat(undefined, {
                  style: "currency",
                  currency: d.currency,
                }).format(Number(d.value_cents) / 100)}
              </span>
              <span>{d.probability}% weighted</span>
              <form action={moveDeal} className="flex gap-2">
                <input type="hidden" name="id" value={d.id} />
                <select
                  name="stage_id"
                  defaultValue={d.stage_id}
                  className="h-8 flex-1 rounded-lg border bg-background px-2"
                >
                  {stages?.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <Input
                  name="lost_reason"
                  placeholder="Lost reason if applicable"
                />
                <Button variant="outline">Update</Button>
              </form>
            </div>
          ))}
          {!deals?.length && (
            <p className="py-8 text-center text-muted-foreground">
              No deals yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
