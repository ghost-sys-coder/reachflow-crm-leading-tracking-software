"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ProspectForm } from "@/components/crm/prospect-form"
import { updateProspect } from "@/app/actions/prospects"
import type { ProspectCreateInput } from "@/lib/validation/schemas"
import type { Prospect } from "@/types/database"

export function EditProspectDialog({
  prospect,
  open,
  onOpenChange,
  industryOptions,
  customPlatforms,
}: {
  prospect: Prospect
  open: boolean
  onOpenChange: (open: boolean) => void
  industryOptions?: string[]
  customPlatforms?: string[]
}) {
  async function handleSubmit(values: ProspectCreateInput) {
    const result = await updateProspect(prospect.id, values)
    if (!result.error) onOpenChange(false)
    return { error: result.error }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90dvh] flex-col overflow-hidden sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit prospect</DialogTitle>
          <DialogDescription>Update the details for {prospect.business_name}.</DialogDescription>
        </DialogHeader>
        <ProspectForm
          prospect={prospect}
          industryOptions={industryOptions}
          customPlatforms={customPlatforms}
          submitLabel="Save changes"
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
