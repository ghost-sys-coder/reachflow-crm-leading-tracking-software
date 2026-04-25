import Link from "next/link"
import { CheckCircle2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { requestPasswordReset } from "@/app/(auth)/actions"

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>
}) {
  const params = await searchParams

  if (params.sent) {
    return <ResetSentState email={params.sent} />
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Reset your password</h1>
        <p className="text-sm text-muted-foreground">
          Enter the email for your workspace and we&apos;ll send you a reset link.
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

      <form action={requestPasswordReset} className="space-y-4">
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

        <Button type="submit" className="w-full">
          Send reset link
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Remembered it?{" "}
        <Link href="/sign-in" className="font-medium text-foreground hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  )
}

function ResetSentState({ email }: { email: string }) {
  return (
    <div className="space-y-5 text-center">
      <div className="mx-auto inline-flex size-12 items-center justify-center rounded-full bg-success/15 text-success">
        <CheckCircle2 className="size-6" />
      </div>
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Reset link on the way</h1>
        <p className="text-sm text-muted-foreground">
          If an account exists for{" "}
          <span className="font-medium text-foreground">{email}</span>, you&apos;ll get an email
          with a link to set a new password.
        </p>
      </div>
      <Link href="/sign-in" className="text-sm font-medium text-primary hover:underline">
        Back to sign in
      </Link>
    </div>
  )
}
