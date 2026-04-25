"use client"

import * as React from "react"
import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ProspectForm } from "@/components/crm/prospect-form"
import { createProspect } from "@/app/actions/prospects"
import type { ProspectCreateInput } from "@/lib/validation/schemas"

export function AddProspectDialog({
  industrySuggestions,
  triggerLabel = "Add prospect",
  variant = "default",
  size = "sm",
}: {
  industrySuggestions?: string[]
  triggerLabel?: string
  variant?: React.ComponentProps<typeof Button>["variant"]
  size?: React.ComponentProps<typeof Button>["size"]
}) {
  const [open, setOpen] = React.useState(false)

  async function handleSubmit(values: ProspectCreateInput) {
    const result = await createProspect(values)
    if (!result.error) setOpen(false)
    return { error: result.error }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size}>
          <Plus />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add prospect</DialogTitle>
          <DialogDescription>
            Capture a new lead. You can generate outreach for them right after.
          </DialogDescription>
        </DialogHeader>
        <ProspectForm
          industrySuggestions={industrySuggestions}
          submitLabel="Add prospect"
          onSubmit={handleSubmit}
          onCancel={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
