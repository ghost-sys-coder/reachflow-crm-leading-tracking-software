import { ArrowUpRight, MessagesSquare, Radar, Workflow } from "lucide-react"

import { Reveal } from "@/components/landing/reveal"

const FEATURES = [
  { icon: Workflow, number: "01", title: "Build the workflow once", body: "Move prospects through a clear pipeline and schedule the next touch without rebuilding your process every week." },
  { icon: Radar, number: "02", title: "Know who needs attention", body: "See every prospect, status, owner, location, and last contact date before a warm lead goes quiet." },
  { icon: MessagesSquare, number: "03", title: "Keep the whole conversation", body: "Record email, Instagram, LinkedIn, Facebook, X, calls, and custom outreach in one chronological history." },
]

export function LandingFeaturesV2() {
  return (
    <section id="features" className="border-b border-[#e8e8e4] bg-[#fbfbf8] py-28 text-[#171715] sm:py-36">
      <div className="mx-auto max-w-[1180px] px-5 sm:px-8">
        <Reveal className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-24">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.18em] text-[#356df3] uppercase">Everything in one place</p>
            <h2 className="mt-5 max-w-md text-balance font-[Georgia,serif] text-4xl leading-[1.02] font-semibold tracking-[-0.04em] sm:text-6xl">
              A quieter way to run outbound.
            </h2>
          </div>
          <p className="max-w-xl self-end text-base leading-7 text-[#666660] sm:text-lg">
            Replace scattered spreadsheets, message drafts, and follow-up reminders with a workspace your whole team can understand at a glance.
          </p>
        </Reveal>

        <div className="mt-20 border-t border-[#dcdcd6]">
          {FEATURES.map(({ icon: Icon, number, title, body }, index) => (
            <Reveal key={title} delay={index * 0.06}>
              <article className="group grid gap-6 border-b border-[#dcdcd6] py-10 sm:grid-cols-[5rem_4rem_1fr_1fr] sm:items-start sm:gap-8">
                <span className="font-mono text-xs text-[#92928b]">{number}</span>
                <Icon className="size-6 stroke-[1.5] text-[#356df3]" />
                <h3 className="text-xl font-semibold tracking-[-0.025em] sm:text-2xl">{title}</h3>
                <div className="flex gap-6"><p className="max-w-md text-sm leading-6 text-[#696963]">{body}</p><ArrowUpRight className="mt-1 size-4 shrink-0 text-[#9b9b94] transition group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-[#356df3]" /></div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
