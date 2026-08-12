"use client"

import { useRef, type ReactNode } from "react"
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "framer-motion"
import { Check, Clock3, Mail, MessageCircle, Phone, Send, Sparkles } from "lucide-react"

import { PipelinePreview } from "@/components/landing/pipeline-preview"

type PreviewFrameProps = {
  children: ReactNode
  label: string
}

function PreviewFrame({ children, label }: PreviewFrameProps) {
  return (
    <article className="relative w-full border border-[#deded8] bg-white p-3 shadow-[0_30px_80px_rgba(28,28,24,0.12)] sm:p-7">
      <div className="mb-5 flex items-center justify-between border-b border-[#ecece8] pb-4">
        <div className="flex gap-1.5" aria-hidden>
          <span className="size-2 rounded-full bg-[#dadad4]" />
          <span className="size-2 rounded-full bg-[#dadad4]" />
          <span className="size-2 rounded-full bg-[#dadad4]" />
        </div>
        <span className="font-mono text-[10px] tracking-wider text-[#8a8a83] uppercase">{label}</span>
      </div>
      {children}
    </article>
  )
}

const outreach = [
  {
    channel: "LinkedIn",
    time: "Today, 9:42 AM",
    text: "Hi Maya - your studio's hospitality work stood out. We help teams like yours turn warm referrals into a predictable pipeline. Open to a quick walkthrough?",
    icon: MessageCircle,
  },
  {
    channel: "Email",
    time: "Monday, 2:18 PM",
    text: "Sharing the two-minute overview I mentioned. The reporting view should be especially useful for your client services team.",
    icon: Mail,
  },
  {
    channel: "Call",
    time: "Friday, 11:05 AM",
    text: "Spoke with Maya. Reviewing the workflow with her operations lead before Thursday's follow-up.",
    icon: Phone,
  },
]

function OutreachPreview() {
  return (
    <div className="mx-auto grid w-full max-w-3xl gap-5 md:grid-cols-[0.8fr_1.2fr]">
      <aside className="border border-[#e4e4df] bg-[#fafaf7] p-5">
        <div className="flex size-10 items-center justify-center rounded-full bg-[#e9efff] text-[#356df3]">
          <span className="text-sm font-semibold">MH</span>
        </div>
        <p className="mt-4 text-base font-semibold">Maya Henderson</p>
        <p className="mt-1 text-xs leading-5 text-[#74746e]">Founder, Northline Studio</p>
        <dl className="mt-7 space-y-4 border-t border-[#e4e4df] pt-5 text-xs">
          <div className="flex justify-between gap-4"><dt className="text-[#85857e]">Stage</dt><dd className="font-medium">Conversation</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-[#85857e]">Location</dt><dd className="font-medium">Austin, TX</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-[#85857e]">Next step</dt><dd className="font-medium text-[#356df3]">Thursday</dd></div>
        </dl>
      </aside>
      <div className="border border-[#e4e4df] p-5 sm:p-6">
        <div className="mb-5 flex items-center justify-between">
          <div><p className="text-sm font-semibold">Outreach history</p><p className="mt-1 text-xs text-[#85857e]">Every touchpoint, in order</p></div>
          <span className="inline-flex items-center gap-1.5 bg-[#eef3ff] px-2.5 py-1 text-[10px] font-medium text-[#356df3]"><Sparkles className="size-3" /> Active</span>
        </div>
        <div className="space-y-3">
          {outreach.map(({ channel, time, text, icon: Icon }) => (
            <div key={`${channel}-${time}`} className="grid grid-cols-[2rem_1fr] gap-3 border-t border-[#ecece8] pt-3 first:border-t-0 first:pt-0">
              <div className="flex size-8 items-center justify-center rounded-full border border-[#deded8] bg-white"><Icon className="size-3.5 text-[#356df3]" /></div>
              <div><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-semibold">{channel}</p><time className="text-[10px] text-[#92928b]">{time}</time></div><p className="mt-1.5 text-xs leading-5 text-[#62625c]">{text}</p></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const workflow = [
  { title: "Personalized introduction", detail: "LinkedIn message", status: "Sent", icon: Send },
  { title: "Value-led follow-up", detail: "Email - 2 days later", status: "Sent", icon: Mail },
  { title: "Conversation check-in", detail: "Call - Tomorrow at 10:00 AM", status: "Next", icon: Phone },
  { title: "Final helpful resource", detail: "Email - 4 days later", status: "Queued", icon: Clock3 },
]

function FollowUpPreview() {
  return (
    <div className="mx-auto w-full max-w-3xl border border-[#e4e4df] bg-[#fafaf7] p-5 sm:p-7">
      <div className="flex flex-col justify-between gap-4 border-b border-[#e4e4df] pb-5 sm:flex-row sm:items-center">
        <div><p className="text-base font-semibold">Northline Studio follow-up</p><p className="mt-1 text-xs text-[#74746e]">A thoughtful sequence that stops when Maya replies</p></div>
        <span className="inline-flex w-fit items-center gap-1.5 bg-[#eaf7f1] px-3 py-1.5 text-[11px] font-medium text-[#2f8f63]"><Check className="size-3.5" /> Running</span>
      </div>
      <ol className="mt-2">
        {workflow.map(({ title, detail, status, icon: Icon }, index) => (
          <li key={title} className="relative grid grid-cols-[2.5rem_1fr_auto] items-center gap-3 border-b border-[#e8e8e3] py-4 last:border-0">
            <div className="relative z-10 flex size-9 items-center justify-center rounded-full border border-[#dcdcd6] bg-white"><Icon className="size-4 text-[#356df3]" /></div>
            <div><p className="text-xs font-semibold sm:text-sm">{index + 1}. {title}</p><p className="mt-1 text-[11px] text-[#85857e]">{detail}</p></div>
            <span className={`px-2 py-1 text-[10px] font-medium ${status === "Sent" ? "bg-[#eaf7f1] text-[#2f8f63]" : status === "Next" ? "bg-[#eef3ff] text-[#356df3]" : "bg-[#eeeeea] text-[#74746e]"}`}>{status}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

const previews = [
  { label: "Live pipeline", content: <PipelinePreview /> },
  { label: "Outreach history", content: <OutreachPreview /> },
  { label: "Follow-up workflow", content: <FollowUpPreview /> },
]

function FlowingPreviews() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 py-16 sm:py-20">
      {previews.map((preview) => (
        <motion.div
          key={preview.label}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.12 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <PreviewFrame label={preview.label}>{preview.content}</PreviewFrame>
        </motion.div>
      ))}
    </div>
  )
}

function StackedPreview({
  children,
  opacity,
  transform,
  zIndex,
}: {
  children: ReactNode
  opacity: MotionValue<number> | number
  transform: MotionValue<string> | string
  zIndex: number
}) {
  return (
    <motion.div className="absolute inset-x-0 top-1/2 will-change-[transform,opacity]" style={{ opacity, transform, zIndex }}>
      {children}
    </motion.div>
  )
}

function AnimatedStack() {
  const containerRef = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start start", "end end"] })

  // Each incoming page starts well below the pinned viewport, rises over the
  // current page, then holds before the following page begins its takeover.
  const pipelineTransform = useTransform(
    scrollYProgress,
    [0, 0.17, 0.42, 0.55, 1],
    [
      "translate3d(0, -50%, 0) scale(1)",
      "translate3d(0, -50%, 0) scale(1)",
      "translate3d(0, calc(-50% - 2.25rem), 0) scale(0.94)",
      "translate3d(0, calc(-50% - 2.25rem), 0) scale(0.94)",
      "translate3d(0, calc(-50% - 3.5rem), 0) scale(0.9)",
    ],
  )
  const pipelineOpacity = useTransform(scrollYProgress, [0, 0.44, 0.58], [1, 1, 0.42])

  const outreachTransform = useTransform(
    scrollYProgress,
    [0.12, 0.18, 0.42, 0.55, 0.79, 1],
    [
      "translate3d(0, calc(-50% + 72vh), 0) scale(0.92)",
      "translate3d(0, calc(-50% + 72vh), 0) scale(0.92)",
      "translate3d(0, -50%, 0) scale(1)",
      "translate3d(0, -50%, 0) scale(1)",
      "translate3d(0, calc(-50% - 2.25rem), 0) scale(0.94)",
      "translate3d(0, calc(-50% - 2.25rem), 0) scale(0.94)",
    ],
  )
  const outreachOpacity = useTransform(scrollYProgress, [0.12, 0.17, 0.42, 0.8, 0.92], [0, 1, 1, 1, 0.48])

  const followUpTransform = useTransform(
    scrollYProgress,
    [0.51, 0.57, 0.82, 1],
    [
      "translate3d(0, calc(-50% + 72vh), 0) scale(0.92)",
      "translate3d(0, calc(-50% + 72vh), 0) scale(0.92)",
      "translate3d(0, -50%, 0) scale(1)",
      "translate3d(0, -50%, 0) scale(1)",
    ],
  )
  const followUpOpacity = useTransform(scrollYProgress, [0.51, 0.56, 0.82], [0, 1, 1])

  return (
    <section ref={containerRef} className="relative hidden h-[420dvh] md:block" aria-label="ReachFlow product tour">
      <div className="sticky top-20 flex min-h-[calc(100dvh-6rem)] items-center">
        <div className="relative mx-auto h-[min(38rem,calc(100dvh-8rem))] w-full max-w-5xl">
          <div className="absolute inset-x-[8%] bottom-0 h-36 bg-[#dfe9ff] blur-3xl" aria-hidden />
          <StackedPreview zIndex={1} opacity={pipelineOpacity} transform={pipelineTransform}><PreviewFrame label={previews[0].label}>{previews[0].content}</PreviewFrame></StackedPreview>
          <StackedPreview zIndex={2} opacity={outreachOpacity} transform={outreachTransform}><PreviewFrame label={previews[1].label}>{previews[1].content}</PreviewFrame></StackedPreview>
          <StackedPreview zIndex={3} opacity={followUpOpacity} transform={followUpTransform}><PreviewFrame label={previews[2].label}>{previews[2].content}</PreviewFrame></StackedPreview>
        </div>
      </div>
    </section>
  )
}

export function ProductPreviewStack() {
  const reduceMotion = useReducedMotion()

  return (
    <div className="relative mt-4 sm:mt-8">
      <div className="md:hidden"><FlowingPreviews /></div>
      {reduceMotion ? <div className="hidden md:block"><FlowingPreviews /></div> : <AnimatedStack />}
    </div>
  )
}
