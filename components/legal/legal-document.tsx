import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BrandMark } from "@/components/shared/brand-mark";

const EFFECTIVE_DATE = "September 4, 2026";

export function LegalDocument({ eyebrow, title, summary, children }: { eyebrow: string; title: string; summary: string; children: React.ReactNode }) {
  return <div className="min-h-dvh bg-[#fbfbf8] text-[#171715]">
    <header className="border-b border-[#e4e4df] bg-[#fbfbf8]/95"><div className="mx-auto flex h-16 max-w-[1120px] items-center justify-between px-5 sm:px-8"><Link href="/v2" aria-label="ReachFlow home"><BrandMark size="md"/></Link><Link href="/v2" className="inline-flex items-center gap-2 text-xs font-medium text-[#686862] transition hover:text-[#171715]"><ArrowLeft className="size-3.5"/>Back to website</Link></div></header>
    <main className="mx-auto grid max-w-[1120px] gap-10 px-5 py-12 sm:px-8 sm:py-16 lg:grid-cols-[250px_minmax(0,700px)] lg:gap-16">
      <aside className="lg:sticky lg:top-10 lg:self-start"><p className="text-xs font-semibold tracking-[0.16em] text-[#356df3] uppercase">{eyebrow}</p><p className="mt-4 text-xs leading-5 text-[#686862]">Effective {EFFECTIVE_DATE}<br/>Last updated {EFFECTIVE_DATE}</p><nav className="mt-8 grid gap-2 text-sm" aria-label="Legal pages"><Link className="text-[#686862] hover:text-[#171715]" href="/privacy">Privacy Policy</Link><Link className="text-[#686862] hover:text-[#171715]" href="/terms">Terms of Service</Link><Link className="text-[#686862] hover:text-[#171715]" href="/data-deletion">Data Deletion</Link></nav></aside>
      <article><h1 className="max-w-2xl text-4xl font-semibold tracking-[-0.04em] text-balance sm:text-5xl">{title}</h1><p className="mt-5 max-w-2xl text-base leading-7 text-[#686862]">{summary}</p><div className="legal-copy mt-12 space-y-10 text-[15px] leading-7 text-[#3f3f3a] [&_a]:font-medium [&_a]:text-[#2458ca] [&_a]:underline [&_a]:underline-offset-4 [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-[#171715] [&_h3]:mt-5 [&_h3]:font-semibold [&_h3]:text-[#171715] [&_li]:ml-5 [&_li]:list-disc [&_p+p]:mt-3 [&_ul]:mt-3 [&_ul]:space-y-2">{children}</div></article>
    </main>
    <footer className="border-t border-[#e4e4df]"><div className="mx-auto flex max-w-[1120px] flex-col justify-between gap-3 px-5 py-8 text-xs text-[#686862] sm:flex-row sm:px-8"><p>© {new Date().getFullYear()} ReachFlow</p><p>Questions: <a className="text-[#171715]" href="mailto:support@veilcode.studio">support@veilcode.studio</a></p></div></footer>
  </div>;
}
