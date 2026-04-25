"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { PLATFORM_LABELS } from "@/components/crm/platform-icon"
import { PROSPECT_STATUS_LABELS } from "@/components/crm/status-badge"
import {
  PLATFORMS,
  PROSPECT_STATUSES,
  prospectCreateSchema,
  type ProspectCreateInput,
} from "@/lib/validation/schemas"
import type { Prospect } from "@/types/database"

type FormValues = {
  business_name: string
  platform: ProspectCreateInput["platform"]
  handle?: string
  industry?: string
  location?: string
  website_url?: string
  status: ProspectCreateInput["status"]
  notes?: string
  follow_up_at?: Date
}

function prospectToFormValues(prospect?: Prospect): FormValues {
  return {
    business_name: prospect?.business_name ?? "",
    platform: (prospect?.platform ?? "instagram") as FormValues["platform"],
    handle: prospect?.handle ?? undefined,
    industry: prospect?.industry ?? undefined,
    location: prospect?.location ?? undefined,
    website_url: prospect?.website_url ?? undefined,
    status: (prospect?.status ?? "sent") as FormValues["status"],
    notes: prospect?.notes ?? undefined,
  }
}

export function ProspectForm({
  prospect,
  industrySuggestions = [],
  submitLabel = "Save",
  onSubmit,
  onCancel,
}: {
  prospect?: Prospect
  industrySuggestions?: string[]
  submitLabel?: string
  onSubmit: (values: ProspectCreateInput) => Promise<{ error: string | null }>
  onCancel?: () => void
}) {
  const form = useForm<FormValues>({
    //cast: react-hook-form narrows undefined differently than zod;
    //runtime behaviour is identical and ProspectCreateInput is the
    //canonical payload shape handed to onSubmit.
    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(prospectCreateSchema) as any,
    defaultValues: prospectToFormValues(prospect),
  })

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = form

  const industryListId = React.useId()

  async function handle(values: FormValues) {
    const result = await onSubmit(values as ProspectCreateInput)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success(prospect ? "Prospect updated" : "Prospect added")
  }

  return (
    <form onSubmit={handleSubmit(handle)} className="space-y-4" noValidate>
      <div className="grid gap-2">
        <Label htmlFor="business_name">
          Business name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="business_name"
          autoFocus
          placeholder="Sam's Plumbing"
          {...register("business_name")}
          aria-invalid={!!errors.business_name}
        />
        {errors.business_name && (
          <p className="text-xs text-destructive">{errors.business_name.message}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="platform">
            Platform <span className="text-destructive">*</span>
          </Label>
          <Controller
            control={control}
            name="platform"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="platform" className="w-full">
                  <SelectValue placeholder="Pick a platform" />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {PLATFORM_LABELS[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="status">Status</Label>
          <Controller
            control={control}
            name="status"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROSPECT_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {PROSPECT_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="handle">Handle / email</Label>
        <Input
          id="handle"
          placeholder="@handle, email address, or profile URL"
          {...register("handle")}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="industry">Industry</Label>
          <Input
            id="industry"
            list={industryListId}
            placeholder="Trades, Healthcare, Retail..."
            {...register("industry")}
          />
          <datalist id={industryListId}>
            {industrySuggestions.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="location">Location</Label>
          <Input id="location" placeholder="Tucson, AZ" {...register("location")} />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="website_url">Website</Label>
        <Input
          id="website_url"
          type="url"
          placeholder="https://example.com"
          {...register("website_url")}
          aria-invalid={!!errors.website_url}
        />
        {errors.website_url && (
          <p className="text-xs text-destructive">{errors.website_url.message}</p>
        )}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          rows={3}
          placeholder="Pain points, prior touchpoints, anything to remember..."
          {...register("notes")}
        />
      </div>

      <div className="flex items-center justify-end gap-2 pt-2">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  )
}
