import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { PublicHostedForm } from "@/components/forms/public-hosted-form";
import { BrandMark } from "@/components/shared/brand-mark";
import type { HostedFormField } from "@/lib/forms/fields";

export default async function HostedFormPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { data: form } = await createAdminClient().from("hosted_forms")
    .select("slug,title,description,fields,consent_text,submit_label")
    .eq("slug", slug).eq("status", "active").maybeSingle();
  if (!form) notFound();
  return <main className="min-h-dvh bg-[radial-gradient(circle_at_top_left,oklch(0.94_0.035_210),transparent_35%),linear-gradient(to_bottom,white,oklch(0.98_0.006_250))] px-4 py-10 sm:py-16">
    <div className="mx-auto max-w-2xl"><div className="mb-8 flex justify-center"><BrandMark size="md" showWordmark/></div>
      <section className="rounded-3xl border border-black/8 bg-white/90 p-6 shadow-[0_28px_80px_-45px_oklch(0.25_0.04_250/0.45)] backdrop-blur sm:p-10">
        <header className="mb-8"><p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">Contact us</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{form.title}</h1>{form.description && <p className="mt-3 text-muted-foreground">{form.description}</p>}</header>
        <PublicHostedForm slug={form.slug} fields={(form.fields ?? []) as HostedFormField[]} consentText={form.consent_text} submitLabel={form.submit_label}/>
      </section><p className="mt-6 text-center text-xs text-muted-foreground">Securely submitted through ReachFlow</p>
    </div>
  </main>;
}
