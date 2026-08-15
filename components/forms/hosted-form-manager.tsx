"use client";

import { useActionState, useEffect } from "react";
import Link from "next/link";
import { Check, Clipboard, CodeXml, ExternalLink, FileInput, LoaderCircle, Pause, Play, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createHostedForm, deleteHostedForm, setHostedFormStatus, type HostedFormActionState } from "@/app/actions/hosted-forms";
import { HOSTED_FORM_FIELDS } from "@/lib/forms/fields";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogMedia, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type HostedForm = { id: string; name: string; slug: string; status: string; title: string; created_at: string; source_id: string };
type SubmissionEvent = { id: string; status: string; outcome: string | null; error_message: string | null; prospect_id: string | null };
type Submission = { id: string; form_id: string; submitted_at: string; consent_given: boolean; ingestion_events: SubmissionEvent | SubmissionEvent[] | null };
const initial: HostedFormActionState = { success: false, message: "" };

function Feedback({ state }: { state: HostedFormActionState }) {
  useEffect(() => { if (state.message) (state.success ? toast.success : toast.error)(state.message); }, [state]);
  return state.message ? <p role="status" className={`text-xs ${state.success ? "text-emerald-600" : "text-destructive"}`}>{state.message}</p> : null;
}

function CreateForm() {
  const [state, action, pending] = useActionState(createHostedForm, initial);
  return <Card><CardHeader><CardTitle>Create a hosted lead form</CardTitle></CardHeader><CardContent>
    <form action={action} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2"><div><Label htmlFor="form-name">Internal name</Label><Input id="form-name" name="name" placeholder="Website contact form" required disabled={pending}/></div><div><Label htmlFor="form-title">Public heading</Label><Input id="form-title" name="title" placeholder="Tell us about your business" required disabled={pending}/></div></div>
      <div><Label htmlFor="form-description">Public description</Label><Textarea id="form-description" name="description" placeholder="Share a few details and our team will follow up." disabled={pending}/></div>
      <div><p className="text-sm font-medium">Fields</p><p className="text-xs text-muted-foreground">Business name is always included. Choose the additional information you want to collect.</p><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{HOSTED_FORM_FIELDS.map((field) => <div key={field.name} className="rounded-lg border p-3"><label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" name={`include_${field.name}`} defaultChecked disabled={field.name === "business_name" || pending}/>{field.label}</label>{field.name !== "business_name" && <label className="mt-2 flex items-center gap-2 text-xs text-muted-foreground"><input type="checkbox" name={`require_${field.name}`} disabled={pending}/>Make required</label>}</div>)}</div></div>
      <div className="grid gap-4 md:grid-cols-2"><div><Label htmlFor="form-platform">Default outreach platform</Label><Select name="platform" defaultValue="other" disabled={pending}><SelectTrigger id="form-platform" className="mt-1.5 h-9 w-full"><SelectValue /></SelectTrigger><SelectContent>{[["instagram","Instagram"],["email","Email"],["facebook","Facebook"],["linkedin","LinkedIn"],["x","X"],["call","Call"],["other","Other"]].map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div><div><Label htmlFor="submit-label">Button label</Label><Input className="mt-1.5" id="submit-label" name="submit_label" defaultValue="Send details" disabled={pending}/></div></div>
      <div><Label htmlFor="consent-text">Consent statement</Label><Textarea id="consent-text" name="consent_text" defaultValue="I agree that this business may use these details to contact me about its services." required disabled={pending}/></div>
      <div><Label htmlFor="success-message">Success message</Label><Input id="success-message" name="success_message" defaultValue="Thank you. We have received your details and will follow up shortly." disabled={pending}/></div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="publish_now" defaultChecked disabled={pending}/>Publish immediately</label>
      <div className="flex flex-wrap items-center gap-3"><Button disabled={pending}>{pending ? <><LoaderCircle className="animate-spin"/>Creating…</> : <><FileInput/>Create form</>}</Button><Feedback state={state}/></div>
    </form>
  </CardContent></Card>;
}

function FormCard({ form, appUrl, count }: { form: HostedForm; appUrl: string; count: number }) {
  const [statusState, statusAction, statusPending] = useActionState(setHostedFormStatus, initial);
  const [deleteState, deleteAction, deletePending] = useActionState(deleteHostedForm, initial);
  const url = `${appUrl}/f/${form.slug}`;
  async function copy() { await navigator.clipboard.writeText(url); toast.success("Public form URL copied"); }
  async function copyEmbed() { await navigator.clipboard.writeText(`<iframe src="${url}" title="${form.title}" width="100%" height="760" style="border:0;border-radius:16px" loading="lazy"></iframe>`); toast.success("Embed code copied"); }
  return <Card><CardHeader className="border-b"><div className="flex min-w-0 items-start justify-between gap-3"><div className="min-w-0"><CardTitle className="truncate">{form.name}</CardTitle><p className="mt-1 truncate text-xs text-muted-foreground">{form.title}</p></div><Badge variant={form.status === "active" ? "default" : "secondary"}>{form.status}</Badge></div></CardHeader><CardContent className="space-y-4">
    <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3"><span className="text-xs text-muted-foreground">Submissions</span><strong className="text-lg">{count}</strong></div>
    <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" size="sm" onClick={copy}><Clipboard/>Copy URL</Button><Button type="button" variant="outline" size="sm" onClick={copyEmbed}><CodeXml/>Embed</Button>{form.status === "active" && <Button asChild variant="outline" size="sm"><Link href={`/f/${form.slug}`} target="_blank"><ExternalLink/>Open</Link></Button>}
      <form action={statusAction}><input type="hidden" name="id" value={form.id}/><input type="hidden" name="status" value={form.status === "active" ? "draft" : "active"}/><Button size="sm" variant="outline" disabled={statusPending}>{statusPending ? <LoaderCircle className="animate-spin"/> : form.status === "active" ? <Pause/> : <Play/>}{form.status === "active" ? "Pause" : "Publish"}</Button></form>
      <AlertDialog><AlertDialogTrigger asChild><Button size="sm" variant="destructive"><Trash2/>Delete</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogMedia className="bg-destructive/10 text-destructive"><Trash2/></AlertDialogMedia><AlertDialogTitle>Delete {form.name}?</AlertDialogTitle><AlertDialogDescription>This permanently removes the public form, its source, and submission history. Prospects already created remain in ReachFlow.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Keep form</AlertDialogCancel><form action={deleteAction}><input type="hidden" name="id" value={form.id}/><AlertDialogAction type="submit" variant="destructive" disabled={deletePending}>{deletePending ? "Deleting…" : "Delete form"}</AlertDialogAction></form></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div><Feedback state={statusState}/><Feedback state={deleteState}/>
  </CardContent></Card>;
}

export function HostedFormManager({ forms, submissions, appUrl }: { forms: HostedForm[]; submissions: Submission[]; appUrl: string }) {
  const counts = new Map<string, number>(); submissions.forEach((item) => counts.set(item.form_id, (counts.get(item.form_id) ?? 0) + 1));
  const names = new Map(forms.map((form) => [form.id, form.name]));
  return <div className="space-y-6"><CreateForm/><section><div className="mb-3"><h2 className="text-lg font-semibold">Your forms</h2><p className="text-sm text-muted-foreground">Publish, pause, open, or remove each intake route.</p></div>{forms.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{forms.map((form) => <FormCard key={form.id} form={form} appUrl={appUrl} count={counts.get(form.id) ?? 0}/>)}</div> : <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">No hosted forms yet.</div>}</section>
    <Card><CardHeader><CardTitle>Recent submissions</CardTitle></CardHeader><CardContent>{submissions.length ? <div className="divide-y">{submissions.map((submission) => { const event = Array.isArray(submission.ingestion_events) ? submission.ingestion_events[0] : submission.ingestion_events; return <div key={submission.id} className="grid gap-2 py-4 sm:grid-cols-[1fr_auto] sm:items-center"><div className="min-w-0"><p className="truncate font-medium">{names.get(submission.form_id) ?? "Deleted form"}</p><p className="text-xs text-muted-foreground">{new Date(submission.submitted_at).toLocaleString()} · {event?.outcome ?? event?.error_message ?? "Received"}</p></div><div className="flex items-center gap-2"><Badge variant={event?.status === "failed" ? "destructive" : "secondary"}>{event?.status ?? "received"}</Badge>{submission.consent_given && <Badge variant="outline"><Check/>Consent</Badge>}{event?.prospect_id && <Button asChild size="sm" variant="ghost"><Link href={`/prospects/${event.prospect_id}`}>Prospect</Link></Button>}</div></div>; })}</div> : <p className="py-8 text-center text-sm text-muted-foreground">Submissions will appear here after a published form is used.</p>}</CardContent></Card>
  </div>;
}
