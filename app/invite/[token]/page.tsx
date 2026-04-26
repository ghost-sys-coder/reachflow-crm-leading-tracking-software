import Link from "next/link"
import { redirect } from "next/navigation"
import { Building2, CheckCircle2, XCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { BrandMark } from "@/components/shared/brand-mark"
import { acceptInviteAndRedirect } from "./actions"
import { createClient } from "@/lib/supabase/server"

type InviteRow = {
  id: string
  org_id: string
  email: string
  role: string
  expires_at: string
  org_name: string
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  editor: "Editor",
  viewer: "Viewer",
}

const ROLE_DESCRIPTIONS: Record<string, string> = {
  admin: "Full access — manage members, settings, and all data",
  editor: "Can add and edit prospects and messages",
  viewer: "Read-only access to the workspace",
}

export default async function InvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ error?: string }>
}) {
  const { token } = await params
  const { error: errorParam } = await searchParams

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Look up the invite (bypasses RLS via SECURITY DEFINER function)
  const { data: rows, error: rpcError } = await supabase.rpc("get_invite_by_token", {
    p_token: token,
  })

  const invite = (rows as InviteRow[] | null)?.[0] ?? null

  if (rpcError || !invite) {
    return (
      <InviteShell>
        <div className="space-y-4 text-center">
          <XCircle className="mx-auto size-12 text-destructive/70" />
          <div className="space-y-1">
            <h1 className="text-xl font-semibold">Invite not found</h1>
            <p className="text-sm text-muted-foreground">
              This link may have expired or already been used.
            </p>
          </div>
          <Link href="/sign-in">
            <Button variant="outline" className="mt-2">
              Sign in
            </Button>
          </Link>
        </div>
      </InviteShell>
    )
  }

  if (!user) {
    return (
      <InviteShell>
        <div className="space-y-6">
          <div className="space-y-1.5 text-center">
            <div className="mb-3 inline-flex size-12 items-center justify-center rounded-full border border-border bg-muted">
              <Building2 className="size-5 text-muted-foreground" />
            </div>
            <h1 className="text-xl font-semibold">You&apos;ve been invited</h1>
            <p className="text-sm text-muted-foreground">
              Join <span className="font-medium text-foreground">{invite.org_name}</span> as a{" "}
              <span className="font-medium text-foreground">
                {ROLE_LABELS[invite.role] ?? invite.role}
              </span>
              .
            </p>
          </div>
          <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
            {ROLE_DESCRIPTIONS[invite.role] ?? "Member access"}
          </div>
          <div className="flex flex-col gap-2">
            <Link href={`/sign-up?invite=${token}`}>
              <Button className="w-full">Create account &amp; accept</Button>
            </Link>
            <Link href={`/sign-in?next=/invite/${token}`}>
              <Button variant="outline" className="w-full">
                Sign in to accept
              </Button>
            </Link>
          </div>
        </div>
      </InviteShell>
    )
  }

  return (
    <InviteShell>
      <div className="space-y-6">
        <div className="space-y-1.5 text-center">
          <div className="mb-3 inline-flex size-12 items-center justify-center rounded-full border border-border bg-muted">
            <Building2 className="size-5 text-muted-foreground" />
          </div>
          <h1 className="text-xl font-semibold">Accept invitation</h1>
          <p className="text-sm text-muted-foreground">
            Join <span className="font-medium text-foreground">{invite.org_name}</span> as a{" "}
            <span className="font-medium text-foreground">
              {ROLE_LABELS[invite.role] ?? invite.role}
            </span>
            .
          </p>
        </div>

        <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
          {ROLE_DESCRIPTIONS[invite.role] ?? "Member access"}
        </div>

        {errorParam && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {errorParam}
          </p>
        )}

        <p className="text-center text-xs text-muted-foreground">
          Signing in as{" "}
          <span className="font-medium text-foreground">{user.email}</span>
        </p>

        <form
          action={acceptInviteAndRedirect.bind(null, token)}
          className="flex flex-col gap-2"
        >
          <Button type="submit" className="w-full">
            <CheckCircle2 className="mr-2 size-4" />
            Accept invitation
          </Button>
          <Link href="/pipeline">
            <Button type="button" variant="ghost" className="w-full text-muted-foreground">
              Decline
            </Button>
          </Link>
        </form>
      </div>
    </InviteShell>
  )
}

function InviteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center p-6">
      <div className="mb-8">
        <Link href="/">
          <BrandMark size="md" />
        </Link>
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  )
}
