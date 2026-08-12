import { Reveal } from "@/components/landing/reveal"

const METRICS = [["37%", "more replies"], ["12.4 hrs", "saved each week"], ["2.8×", "faster follow-up"], ["0", "lost conversations"]]

export function LandingSocialProofV2() {
  return (
    <section id="results" className="overflow-hidden border-b border-[#e8e8e4] bg-white py-28 text-[#171715] sm:py-36">
      <div className="mx-auto max-w-[1180px] px-5 sm:px-8">
        <Reveal className="mx-auto max-w-3xl text-center">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-[#356df3] uppercase">Built for consistent execution</p>
          <blockquote className="mt-7 text-balance font-[Georgia,serif] text-3xl leading-[1.15] font-semibold tracking-[-0.035em] sm:text-5xl">
            “Our team stopped asking what happened with a lead. The full story is already there.”
          </blockquote>
          <p className="mt-6 text-sm text-[#696963]">Nadia Okafor · Growth lead at Northline Studio</p>
        </Reveal>
        <Reveal delay={0.08} className="relative mt-24 border-y border-[#dcdcd6] py-16">
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-[linear-gradient(to_top,#edf3ff,transparent)]" aria-hidden />
          <div className="relative grid grid-cols-2 gap-y-12 lg:grid-cols-4">
            {METRICS.map(([value, label], index) => <div key={label} className={index ? "border-l border-[#dcdcd6] pl-6 sm:pl-10" : "sm:pl-2"}><p className="font-mono text-3xl tracking-[-0.05em] sm:text-5xl">{value}</p><p className="mt-3 text-xs text-[#707069]">{label}</p></div>)}
          </div>
          <svg viewBox="0 0 1000 180" className="relative mt-16 h-auto w-full" aria-hidden><path d="M0 168 C210 165 265 145 405 126 S655 93 1000 2" fill="none" stroke="#356df3" strokeWidth="2" /><path d="M0 168 C210 165 265 145 405 126 S655 93 1000 2 L1000 180 L0 180 Z" fill="url(#blueFade)" opacity=".5"/><defs><linearGradient id="blueFade" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#dfe9ff"/><stop offset="1" stopColor="#fff"/></linearGradient></defs></svg>
        </Reveal>
      </div>
    </section>
  )
}
