"use client"

import * as React from "react"
import { toast } from "sonner"

import { updateDigestPreference } from "@/app/actions/profile"
import type { Profile } from "@/types/database"

export function NotificationsSection({ profile }: { profile: Profile | null }) {
  const [enabled, setEnabled] = React.useState(profile?.follow_up_digest ?? true)
  const [pending, setPending] = React.useState(false)

  async function handleToggle() {
    const next = !enabled
    setEnabled(next)
    setPending(true)
    const result = await updateDigestPreference(next)
    setPending(false)
    if (result.error) {
      setEnabled(!next)
      toast.error(result.error)
    } else {
      toast.success(next ? "Digest enabled" : "Digest disabled")
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-6">
        <div className="space-y-1">
          <p className="text-sm font-medium">Daily follow-up digest</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Receive an email at 8 AM UTC each day listing prospects whose follow-up
            date has arrived or is overdue. Admins see all prospects in the workspace;
            other members see only leads assigned to them.
          </p>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          disabled={pending}
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

      <div className="rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground space-y-1">
        <p className="font-medium text-foreground">Setup required</p>
        <p>
          Set <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">SUPABASE_SERVICE_ROLE_KEY</code>,{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">CRON_SECRET</code>, and{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">NEXT_PUBLIC_APP_URL</code> in your
          environment variables, then deploy to Vercel for the cron to activate.
        </p>
      </div>
    </div>
  )
}
