import Link from "next/link"
import { CheckCircle2, Mail } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  signInWithGoogle,
  signInWithMagicLink,
  signInWithPassword,
} from "@/app/(auth)/actions"

type SignInSearchParams = {
  error?: string
  message?: string
  sent?: string
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<SignInSearchParams>
}) {
  const params = await searchParams

  if (params.sent) {
    return <MagicLinkSentState email={params.sent} />
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted-foreground">
          Sign in to your ReachFlow workspace.
        </p>
      </div>

      {params.message && (
        <div className="rounded-md border border-border bg-muted px-3 py-2 text-sm">
          {params.message}
        </div>
      )}
      {params.error && (
        <div
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {params.error}
        </div>
      )}

      <form action={signInWithGoogle}>
        <Button type="submit" variant="outline" className="w-full">
          <GoogleIcon />
          Continue with Google
        </Button>
      </form>

      <Divider label="or continue with email" />

      <form className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="founder@agency.com"
            required
          />
        </div>

        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/forgot-password"
              className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            minLength={8}
          />
        </div>

        <Button type="submit" formAction={signInWithPassword} className="w-full">
          Sign in
        </Button>
        <Button
          type="submit"
          formAction={signInWithMagicLink}
          variant="ghost"
          className="w-full"
        >
          <Mail />
          Send me a magic link
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/sign-up" className="font-medium text-foreground hover:underline">
          Create one
        </Link>
      </p>
    </div>
  )
}

function MagicLinkSentState({ email }: { email: string }) {
  return (
    <div className="space-y-5 text-center">
      <div className="mx-auto inline-flex size-12 items-center justify-center rounded-full bg-success/15 text-success">
        <CheckCircle2 className="size-6" />
      </div>
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Check your inbox</h1>
        <p className="text-sm text-muted-foreground">
          We sent a magic link to <span className="font-medium text-foreground">{email}</span>.
          Click it from this device to sign in.
        </p>
      </div>
      <div className="rounded-md border border-border bg-muted p-3 text-left text-xs text-muted-foreground">
        Link didn&apos;t arrive? Check spam, or try again with the same email in a minute.
      </div>
      <Link href="/sign-in" className="text-sm font-medium text-primary hover:underline">
        Back to sign in
      </Link>
    </div>
  )
}

function Divider({ label }: { label: string }) {
  return (
    <div className="relative">
      <div className="absolute inset-0 flex items-center">
        <span className="w-full border-t border-border" />
      </div>
      <div className="relative flex justify-center text-xs uppercase tracking-wider">
        <span className="bg-background px-2 text-muted-foreground">{label}</span>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path
        d="M21.35 11.1H12v3.2h5.35c-.25 1.4-1.75 4.1-5.35 4.1-3.2 0-5.8-2.65-5.8-5.9s2.6-5.9 5.8-5.9c1.85 0 3.1.8 3.8 1.45l2.6-2.5C16.7 4 14.6 3 12 3 6.9 3 2.75 7.15 2.75 12.25S6.9 21.5 12 21.5c6.95 0 9.35-5 9.35-7.55 0-.55-.05-.95-.15-1.35Z"
        fill="currentColor"
      />
    </svg>
  )
}
