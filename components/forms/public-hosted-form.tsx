"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, LoaderCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { HostedFormField } from "@/lib/forms/fields";

export function PublicHostedForm({ slug, fields, consentText, submitLabel }: { slug: string; fields: HostedFormField[]; consentText: string; submitLabel: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError("");
    const form = new FormData(event.currentTarget);
    const body = Object.fromEntries(form.entries());
    const response = await fetch(`/api/forms/${encodeURIComponent(slug)}/submit`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...body, consent: form.get("consent") === "on" }),
    });
    const result = await response.json().catch(() => ({ message: "Submission failed" }));
    setPending(false);
    if (!response.ok) { setError(result.message); return; }
    setSuccess(result.message);
    if (result.redirectUrl) window.setTimeout(() => window.location.assign(result.redirectUrl), 900);
  }
  if (success) return <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-8 text-center"><CheckCircle2 className="mx-auto size-10 text-emerald-600"/><h2 className="mt-4 text-xl font-semibold">Details received</h2><p className="mt-2 text-sm text-muted-foreground">{success}</p></div>;
  return <form onSubmit={submit} className="space-y-5">
    <div className="grid gap-4 sm:grid-cols-2">
      {fields.map((field) => <div key={field.name} className={field.type === "textarea" ? "sm:col-span-2" : ""}>
        <Label htmlFor={field.name}>{field.label}{field.required ? " *" : ""}</Label>
        {field.type === "textarea" ? <Textarea className="mt-1.5 min-h-28" id={field.name} name={field.name} required={field.required} disabled={pending}/> : <Input className="mt-1.5" id={field.name} name={field.name} type={field.type} required={field.required} disabled={pending}/>} 
      </div>)}
    </div>
    <div className="absolute -left-[10000px]" aria-hidden="true"><Label htmlFor="company_website">Company website</Label><Input id="company_website" name="company_website" tabIndex={-1} autoComplete="off"/></div>
    <div className="rounded-xl border bg-muted/30 p-4"><label className="flex items-start gap-3 text-sm"><input name="consent" type="checkbox" required disabled={pending} className="mt-0.5 size-4 accent-primary"/><span>{consentText}</span></label><p className="mt-3 pl-7 text-xs text-muted-foreground">Submitted securely through ReachFlow. Review the <Link className="underline underline-offset-2 hover:text-foreground" href="/privacy" target="_blank">Privacy Policy</Link> or learn how to <Link className="underline underline-offset-2 hover:text-foreground" href="/data-deletion" target="_blank">request deletion</Link>.</p></div>
    {error && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
    <Button className="w-full" size="lg" disabled={pending}>{pending ? <><LoaderCircle className="animate-spin"/>Submitting…</> : <><Send/>{submitLabel}</>}</Button>
  </form>;
}
