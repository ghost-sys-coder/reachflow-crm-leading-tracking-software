import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { signInWithGoogle, signUpWithPassword } from "@/app/(auth)/actions"

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; invite?: string }>
}) {
  const params = await searchParams
  const invite = params.invite ?? null

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">
          {invite ? "Join your team" : "Create your workspace"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {invite
            ? "Create a free account to accept your invitation."
            : "Start running outreach with a 14-day free trial. No card required."}
        </p>
      </div>

      {params.error && (
        <div
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {params.error}
        </div>
      )}

      <form action={signInWithGoogle}>
        {invite && <input type="hidden" name="invite" value={invite} />}
        <Button type="submit" variant="outline" className="w-full">
          <GoogleIcon />
          Sign up with Google
        </Button>
      </form>

      <Divider label="or sign up with email" />

      <form action={signUpWithPassword} className="space-y-4">
        {invite && <input type="hidden" name="invite" value={invite} />}
        <div className="grid gap-2">
          <Label htmlFor="name">Your name</Label>
          <Input
            id="name"
            name="name"
            autoComplete="name"
            placeholder="Alex from the agency"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="email">Work email</Label>
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
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            aria-describedby="password-hint"
          />
          <p id="password-hint" className="text-xs text-muted-foreground">
            Minimum 8 characters. Use a mix of letters, numbers, and symbols.
          </p>
        </div>

        <Button type="submit" className="w-full">
          Create account
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          By creating an account you agree to our{" "}
          <Link href="#" className="underline hover:text-foreground">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="#" className="underline hover:text-foreground">
            Privacy Policy
          </Link>
          .
        </p>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href={invite ? `/sign-in?next=${encodeURIComponent(`/invite/${invite}`)}` : "/sign-in"}
          className="font-medium text-foreground hover:underline"
        >
          Sign in
        </Link>
      </p>
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
