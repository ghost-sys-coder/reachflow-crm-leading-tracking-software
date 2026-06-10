"use client"

import * as React from "react"
import { toast } from "sonner"

import { updateDigestPreference } from "@/app/actions/profile"
import { triggerFollowUpDigest, triggerSequenceRunner } from "@/app/actions/cron"
import type { Profile } from "@/types/database"

type CronResult = { label: string; detail: string } | null

export function NotificationsSection({ profile }: { profile: Profile | null }) {
  const [enabled, setEnabled] = React.useState(profile?.follow_up_digest ?? true)
  const [togglePending, setTogglePending] = React.useState(false)

  const [digestPending, setDigestPending] = React.useState(false)
  const [digestResult, setDigestResult] = React.useState<CronResult>(null)

  const [seqPending, setSeqPending] = React.useState(false)
  const [seqResult, setSeqResult] = React.useState<CronResult>(null)

  async function handleToggle() {
    const next = !enabled
    setEnabled(next)
    setTogglePending(true)
    const result = await updateDigestPreference(next)
    setTogglePending(false)
    if (result.error) {
      setEnabled(!next)
      toast.error(result.error)
    } else {
      toast.success(next ? "Digest enabled" : "Digest disabled")
    }
  }

  async function handleTestDigest() {
    setDigestPending(true)
    setDigestResult(null)
    const result = await triggerFollowUpDigest()
    setDigestPending(false)
    if (result.error || !result.data) {
      toast.error(result.error ?? "Unknown error")
      setDigestResult({ label: "Failed", detail: result.error ?? "Unknown error" })
    } else {
      const n = result.data.prospectCount
      const detail =
        n === 0
          ? "No overdue prospects — empty digest sent."
          : `${n} overdue prospect${n !== 1 ? "s" : ""} included.`
      toast.success("Test digest sent — check your inbox.")
      setDigestResult({ label: "Sent", detail })
    }
  }

  async function handleTestSequenceRunner() {
    setSeqPending(true)
    setSeqResult(null)
    const result = await triggerSequenceRunner()
    setSeqPending(false)
    if (result.error || !result.data) {
      toast.error(result.error ?? "Unknown error")
      setSeqResult({ label: "Failed", detail: result.error ?? "Unknown error" })
    } else {
      const n = result.data.processed
      const detail =
        n === 0
          ? "No sequence steps were due."
          : `${n} step${n !== 1 ? "s" : ""} processed and draft messages created.`
      toast.success("Sequence runner completed.")
      setSeqResult({ label: "Done", detail })
    }
  }

  return (
    <div className="space-y-6">
      {/* Email digest preference */}
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-6">
          <div className="space-y-1">
            <p className="text-sm font-medium">Daily follow-up digest</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Receive an email at 8 AM UTC each day listing prospects whose follow-up date
              has arrived or is overdue. Admins see all prospects in the workspace; other
              members see only leads assigned to them.
            </p>
          </div>

          <button
            title="toggle follow-up digest"
            type="button"
            role="switch"
            aria-checked={enabled}
            disabled={togglePending}
            onClick={handleToggle}
            className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50 ${
              enabled ? "bg-primary" : "bg-input"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                enabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Cron job test panel */}
      <div className="space-y-3">
        <div>
          <p className="text-sm font-medium">Background jobs</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Test each scheduled job manually. Useful for verifying SMTP settings and
            confirming sequence steps fire correctly before waiting on the live schedule.
          </p>
        </div>

        <div className="divide-y divide-border rounded-lg border border-border">
          {/* Digest cron */}
          <div className="flex items-start justify-between gap-4 p-4">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Follow-up digest</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Runs daily at 08:00 UTC · sends overdue prospect reminders to your inbox
              </p>
              {digestResult && (
                <p
                  className={`mt-1.5 text-[11px] font-medium ${
                    digestResult.label === "Failed" ? "text-destructive" : "text-success"
                  }`}
                >
                  {digestResult.label}: {digestResult.detail}
                </p>
              )}
            </div>
            <button
              type="button"
              disabled={digestPending}
              onClick={handleTestDigest}
              className="shrink-0 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
            >
              {digestPending ? "Sending…" : "Send test now"}
            </button>
          </div>

          {/* Sequence runner cron */}
          <div className="flex items-start justify-between gap-4 p-4">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Sequence runner</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Runs daily at 09:00 UTC · advances due outreach sequence steps and creates draft
                messages
              </p>
              {seqResult && (
                <p
                  className={`mt-1.5 text-[11px] font-medium ${
                    seqResult.label === "Failed" ? "text-destructive" : "text-success"
                  }`}
                >
                  {seqResult.label}: {seqResult.detail}
                </p>
              )}
            </div>
            <button
              type="button"
              disabled={seqPending}
              onClick={handleTestSequenceRunner}
              className="shrink-0 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
            >
              {seqPending ? "Running…" : "Run now"}
            </button>
          </div>
        </div>

        <div className="rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">Deployment note</p>
          <p>
            The live schedule only fires on Vercel after deployment. The test buttons above
            work in both local and production environments — they use the same code path as
            the scheduled crons.
          </p>
          <p className="mt-1">
            Required env vars:{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">SUPABASE_SERVICE_ROLE_KEY</code>
            {" · "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">CRON_SECRET</code>
            {" · "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">SMTP_HOST</code>
            {" · "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">SMTP_USER</code>
            {" · "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">SMTP_PASS</code>
          </p>
        </div>
      </div>
    </div>
  )
}
