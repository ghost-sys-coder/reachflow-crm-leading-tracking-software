"use client"

import * as React from "react"
import {
  Check,
  ChevronDown,
  Circle,
  Database,
  ExternalLink,
  Filter,
  Search,
  ShieldCheck,
} from "lucide-react"
import { toast } from "sonner"

import { setRoadmapFeatureCompletion, updateRoadmapNotes } from "@/app/actions/roadmap"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ROADMAP_FEATURES, ROADMAP_PHASES, type RoadmapFeature } from "@/lib/roadmap/catalog"
import type { RoadmapFeatureProgress } from "@/types/database"

type StatusFilter = "all" | "remaining" | "completed"

function dateLabel(value: Date | string | null) {
  if (!value) return null
  return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
}

function DetailList({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="space-y-2">
      <h4 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">{title}</h4>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-sm leading-6 text-foreground/85">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary/60" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function ExternalRequirements({ feature }: { feature: RoadmapFeature }) {
  if (!feature.externalRequirements.length) {
    return (
      <div className="rounded-lg border border-success/20 bg-success/5 p-4 text-sm">
        <p className="font-medium text-success">No external provider required</p>
        <p className="mt-1 text-muted-foreground">This feature can be implemented using the present application and Supabase infrastructure.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {feature.externalRequirements.map((requirement) => (
        <article key={requirement.service} className="rounded-lg border border-warning/30 bg-warning/5 p-4">
          <div className="flex items-start gap-2">
            <ExternalLink className="mt-0.5 size-4 text-warning" />
            <div><h4 className="font-semibold">{requirement.service}</h4><p className="mt-1 text-sm text-muted-foreground">{requirement.purpose}</p></div>
          </div>
          <div className="mt-4 grid gap-5 lg:grid-cols-2">
            <DetailList title="External setup" items={requirement.setup} />
            <DetailList title="Credentials and API keys" items={requirement.credentials} />
          </div>
          {requirement.webhooks?.length ? <div className="mt-5"><DetailList title="Webhook and callback requirements" items={requirement.webhooks} /></div> : null}
        </article>
      ))}
    </div>
  )
}

function FeatureCard({
  feature,
  progress,
  onProgress,
}: {
  feature: RoadmapFeature
  progress: RoadmapFeatureProgress
  onProgress: (progress: RoadmapFeatureProgress) => void
}) {
  const [notes, setNotes] = React.useState(progress.implementation_notes)
  const [savingNotes, startSavingNotes] = React.useTransition()
  const [savingCompletion, startSavingCompletion] = React.useTransition()
  const notesDirty = notes !== progress.implementation_notes

  function toggleCompletion() {
    const next = !progress.is_completed
    startSavingCompletion(async () => {
      const result = await setRoadmapFeatureCompletion(feature.key, next)
      if (result.error || !result.data) {
        toast.error(result.error ?? "Unable to update roadmap progress")
        return
      }
      onProgress(result.data)
      toast.success(next ? `${feature.title} marked complete` : `${feature.title} reopened`)
    })
  }

  function saveNotes() {
    startSavingNotes(async () => {
      const result = await updateRoadmapNotes(feature.key, notes)
      if (result.error || !result.data) {
        toast.error(result.error ?? "Unable to save implementation notes")
        return
      }
      onProgress(result.data)
      toast.success("Implementation notes saved")
    })
  }

  return (
    <details className="group overflow-hidden rounded-xl border bg-card" open={false}>
      <summary className="flex cursor-pointer list-none items-start gap-4 p-5 marker:hidden sm:p-6">
        <button
          type="button"
          className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border bg-background transition hover:border-primary disabled:opacity-50"
          aria-label={progress.is_completed ? `Reopen ${feature.title}` : `Mark ${feature.title} complete`}
          disabled={savingCompletion}
          onClick={(event) => { event.preventDefault(); toggleCompletion() }}
        >
          {progress.is_completed ? <Check className="size-4 text-success" /> : <Circle className="size-3.5 text-muted-foreground" />}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">{String(feature.order).padStart(2, "0")}</span>
            <h3 className="text-base font-semibold sm:text-lg">{feature.title}</h3>
            {progress.is_completed && <Badge className="bg-success/10 text-success">Complete</Badge>}
            {feature.externalRequirements.length > 0 && <Badge variant="outline"><ExternalLink /> External connection</Badge>}
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{feature.tagline}</p>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span><strong className="text-foreground">Effort:</strong> {feature.effort}</span>
            <span><strong className="text-foreground">Value:</strong> {feature.value}</span>
            <span><strong className="text-foreground">Estimate:</strong> {feature.estimatedDelivery}</span>
          </div>
        </div>
        <ChevronDown className="mt-1 size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>

      <div className="border-t bg-muted/10 p-5 sm:p-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-lg border bg-background p-4 lg:col-span-2">
            <h4 className="font-semibold">Business problem</h4><p className="mt-2 text-sm leading-6 text-muted-foreground">{feature.problem}</p>
            <h4 className="mt-5 font-semibold">Expected outcome</h4><p className="mt-2 text-sm leading-6 text-muted-foreground">{feature.outcome}</p>
          </section>
          <DetailList title="How the feature works" items={feature.workflows} />
          <DetailList title="Existing application integration" items={feature.existingIntegration} />
          <DetailList title="Pages and user interface" items={feature.userInterface} />
          <DetailList title="Database and data model" items={feature.dataModel} />
          <DetailList title="Backend, jobs, and server logic" items={feature.backend} />
          <DetailList title="Security and authorization" items={feature.security} />
          <DetailList title="Analytics and reporting" items={feature.analytics} />
          <DetailList title="Edge cases and failure states" items={feature.edgeCases} />
          <DetailList title="Testing strategy" items={feature.testing} />
          <DetailList title="Dependencies" items={feature.dependencies} />
          <DetailList title="Risks and tradeoffs" items={feature.risks} />
          <DetailList title="Delivery and rollout" items={feature.rollout} />
          <div className="lg:col-span-2">
            <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Database className="size-4 text-primary" /> External services, API keys, and connections</h4>
            <ExternalRequirements feature={feature} />
          </div>
          <section className="rounded-lg border border-primary/20 bg-primary/5 p-4 lg:col-span-2">
            <h4 className="flex items-center gap-2 font-semibold"><ShieldCheck className="size-4 text-primary" /> Definition of done</h4>
            <div className="mt-3"><DetailList title="Acceptance criteria" items={feature.acceptanceCriteria} /></div>
          </section>
        </div>

        <section className="mt-6 rounded-lg border bg-background p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div><h4 className="font-semibold">Shared implementation notes</h4><p className="mt-1 text-xs text-muted-foreground">Record decisions, blockers, credentials still needed, migration details, or rollout observations.</p></div>
            {progress.notes_updated_at && <p className="text-xs text-muted-foreground">Updated {dateLabel(progress.notes_updated_at)} by {progress.notes_updated_by_email ?? "authorized user"}</p>}
          </div>
          <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={7} maxLength={20_000} className="mt-4" placeholder="Add implementation notes…" />
          <div className="mt-3 flex items-center justify-between gap-3"><p className="text-xs text-muted-foreground">{notes.length.toLocaleString()} / 20,000</p><Button size="sm" disabled={!notesDirty || savingNotes} onClick={saveNotes}>{savingNotes ? "Saving…" : notesDirty ? "Save notes" : "Notes saved"}</Button></div>
        </section>

        {progress.is_completed && <p className="mt-4 text-xs text-muted-foreground">Completed {dateLabel(progress.completed_at)} by {progress.completed_by_email ?? "authorized user"}</p>}
      </div>
    </details>
  )
}

function blankProgress(featureKey: string): RoadmapFeatureProgress {
  return { feature_key: featureKey, is_completed: false, implementation_notes: "", completed_at: null, completed_by: null, completed_by_email: null, notes_updated_at: null, notes_updated_by: null, notes_updated_by_email: null, created_at: new Date(), updated_at: new Date() }
}

export function RoadmapPage({ initialProgress }: { initialProgress: RoadmapFeatureProgress[] }) {
  const [progressMap, setProgressMap] = React.useState(() => new Map(initialProgress.map((item) => [item.feature_key, item])))
  const [query, setQuery] = React.useState("")
  const [status, setStatus] = React.useState<StatusFilter>("all")
  const [phase, setPhase] = React.useState<"all" | "1" | "2" | "3">("all")

  const completed = ROADMAP_FEATURES.filter((feature) => progressMap.get(feature.key)?.is_completed).length
  const percentage = Math.round((completed / ROADMAP_FEATURES.length) * 100)
  const normalizedQuery = query.trim().toLowerCase()
  const visibleFeatures = ROADMAP_FEATURES.filter((feature) => {
    const progress = progressMap.get(feature.key)
    if (phase !== "all" && feature.phase !== Number(phase)) return false
    if (status === "completed" && !progress?.is_completed) return false
    if (status === "remaining" && progress?.is_completed) return false
    if (normalizedQuery && ![feature.title, feature.tagline, feature.problem, feature.outcome].join(" ").toLowerCase().includes(normalizedQuery)) return false
    return true
  })

  function updateProgress(progress: RoadmapFeatureProgress) {
    setProgressMap((current) => new Map(current).set(progress.feature_key, progress))
  }

  return (
    <div className="space-y-8">
      <header>
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div><p className="text-xs font-semibold tracking-wider text-primary uppercase">Private product workspace</p><h2 className="mt-2 text-3xl font-semibold tracking-tight">Implementation roadmap</h2><p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">A shared, implementation-ready specification for the next 22 ReachFlow capabilities, ordered from present-code extensions to provider-dependent integrations.</p></div>
          <div className="min-w-56 rounded-xl border bg-card p-4"><div className="flex items-end justify-between"><span className="text-3xl font-semibold tabular-nums">{percentage}%</span><span className="text-xs text-muted-foreground">{completed} of {ROADMAP_FEATURES.length}</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-success transition-[width]" style={{ width: `${percentage}%` }} /></div></div>
        </div>
      </header>

      <section className="grid gap-3 md:grid-cols-3">
        {ROADMAP_PHASES.map((roadmapPhase) => { const phaseFeatures = ROADMAP_FEATURES.filter((feature) => feature.phase === roadmapPhase.id); const phaseCompleted = phaseFeatures.filter((feature) => progressMap.get(feature.key)?.is_completed).length; return <button key={roadmapPhase.id} type="button" onClick={() => setPhase(String(roadmapPhase.id) as "1" | "2" | "3")} className="rounded-xl border bg-card p-4 text-left transition hover:border-primary"><div className="flex items-center justify-between"><Badge variant="outline">Phase {roadmapPhase.id}</Badge><span className="text-xs text-muted-foreground">{phaseCompleted}/{phaseFeatures.length}</span></div><h3 className="mt-3 font-semibold">{roadmapPhase.title}</h3><p className="mt-2 text-xs leading-5 text-muted-foreground">{roadmapPhase.description}</p></button> })}
      </section>

      <section className="flex flex-col gap-3 rounded-xl border bg-card p-4 lg:flex-row">
        <div className="relative flex-1"><Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search roadmap features…" className="pl-9" /></div>
        <div className="flex flex-wrap items-center gap-2"><Filter className="size-4 text-muted-foreground" />{(["all", "remaining", "completed"] as StatusFilter[]).map((value) => <Button key={value} variant={status === value ? "default" : "outline"} size="sm" onClick={() => setStatus(value)} className="capitalize">{value}</Button>)}<select value={phase} onChange={(event) => setPhase(event.target.value as typeof phase)} className="h-8 rounded-lg border bg-background px-3 text-sm"><option value="all">All phases</option><option value="1">Phase 1</option><option value="2">Phase 2</option><option value="3">Phase 3</option></select></div>
      </section>

      <div className="space-y-10">
        {ROADMAP_PHASES.map((roadmapPhase) => { const phaseFeatures = visibleFeatures.filter((feature) => feature.phase === roadmapPhase.id); if (!phaseFeatures.length) return null; return <section key={roadmapPhase.id}><div className="mb-4 flex items-center gap-3"><span className="font-mono text-xs text-primary">PHASE {roadmapPhase.id}</span><div className="h-px flex-1 bg-border" /><span className="text-xs text-muted-foreground">{phaseFeatures.length} features</span></div><div className="space-y-3">{phaseFeatures.map((feature) => <FeatureCard key={feature.key} feature={feature} progress={progressMap.get(feature.key) ?? blankProgress(feature.key)} onProgress={updateProgress} />)}</div></section> })}
        {!visibleFeatures.length && <div className="rounded-xl border border-dashed py-16 text-center"><p className="font-medium">No roadmap features match these filters.</p><Button variant="link" onClick={() => { setQuery(""); setStatus("all"); setPhase("all") }}>Clear filters</Button></div>}
      </div>
    </div>
  )
}
