import Link from "next/link"
import { ArrowLeft, Sparkles } from "lucide-react"

import { AgencyForm } from "@/components/settings/agency-form"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getCurrentOrg } from "@/app/actions/profile"

export default async function AgencySettingsPage() {
  const orgResult = await getCurrentOrg()
  const org = orgResult.data ?? null

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/settings"
          className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to settings
        </Link>
        <h2 className="text-2xl font-semibold tracking-tight">Agency profile</h2>
        <p className="text-sm text-muted-foreground">
          These details power every generated outreach message.
        </p>
      </div>

      <Card>
        <CardHeader className="border-b">
          <div className="flex items-center gap-2">
            <span className="inline-flex size-7 items-center justify-center rounded-md border border-border bg-muted text-primary">
              <Sparkles className="size-3.5" />
            </span>
            <div>
              <CardTitle>How this is used</CardTitle>
              <CardDescription>
                The AI reads every field below before writing a message. More detail here = better personalisation.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-5">
          <AgencyForm org={org} />
        </CardContent>
      </Card>
    </div>
  )
}
