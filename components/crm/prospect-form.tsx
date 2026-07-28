"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js"
import { Controller, useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Combobox } from "@/components/ui/combobox"
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
  CampaignPicker,
  type CampaignOption,
} from "@/components/campaigns/campaign-picker"
import { COUNTRIES } from "@/lib/constants/countries"
import {
  PLATFORMS,
  PROSPECT_STATUSES,
  prospectCreateSchema,
  type ProspectCreateInput,
} from "@/lib/validation/schemas"
import type { Prospect } from "@/types/database"

type ProspectFormProspect = Prospect & {
  campaigns?: CampaignOption[]
}

type CountryOption = {
  name: string
  code: string
  flag: string
  dialingCode: string | null
  phoneExample: string | null
}

const FALLBACK_COUNTRIES: CountryOption[] = COUNTRIES.map((c) => ({
  ...c,
  dialingCode: null,
  phoneExample: null,
}))

function toCountryOptions(countries: CountryOption[]) {
  return countries.map((c) => ({
    value: c.name,
    label: `${c.flag} ${c.name}`,
    hint: c.dialingCode ? `${c.code} · ${c.dialingCode}` : c.code,
  }))
}

const STANDARD_PLATFORM_OPTIONS = PLATFORMS.map((p) => ({
  value: p,
  label: PLATFORM_LABELS[p],
}))

type FormValues = {
  business_name: string
  platform: ProspectCreateInput["platform"]
  handle?: string
  phone_number?: string
  industry?: string
  location?: string
  country?: string
  website_url?: string
  status: ProspectCreateInput["status"]
  notes?: string
  follow_up_at?: Date
  campaign_ids?: string[]
}

function prospectToFormValues(prospect?: ProspectFormProspect): FormValues {
  return {
    business_name: prospect?.business_name ?? "",
    platform: (prospect?.platform ?? "instagram") as FormValues["platform"],
    handle: prospect?.handle ?? undefined,
    phone_number: prospect?.phone_number ?? undefined,
    industry: prospect?.industry ?? undefined,
    location: prospect?.location ?? undefined,
    country: prospect?.country ?? undefined,
    website_url: prospect?.website_url ?? undefined,
    status: (prospect?.status ?? "sent") as FormValues["status"],
    notes: prospect?.notes ?? undefined,
    campaign_ids: prospect?.campaigns?.map((campaign) => campaign.id) ?? [],
  }
}

export function ProspectForm({
  prospect,
  industryOptions = [],
  customPlatforms = [],
  campaignOptions = [],
  initialCampaignIds = [],
  submitLabel = "Save",
  onSubmit,
  onCancel,
}: {
  prospect?: ProspectFormProspect
  industryOptions?: string[]
  customPlatforms?: string[]
  campaignOptions?: CampaignOption[]
  initialCampaignIds?: string[]
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
    defaultValues: {
      ...prospectToFormValues(prospect),
      campaign_ids: prospect?.campaigns?.map((campaign) => campaign.id) ?? initialCampaignIds,
    },
  })

  const {
    register,
    handleSubmit,
    control,
    getValues,
    setValue,
    formState: { errors, isSubmitting },
  } = form
  const [countries, setCountries] = React.useState(FALLBACK_COUNTRIES)
  const selectedCountryName = useWatch({ control, name: "country" })

  React.useEffect(() => {
    let cancelled = false

    fetch("/api/countries")
      .then((response) => {
        if (!response.ok) throw new Error("Unable to load countries")
        return response.json() as Promise<CountryOption[]>
      })
      .then((data) => {
        if (cancelled || !Array.isArray(data) || data.length === 0) return

        setCountries(data)

        const selectedCountry = data.find(
          (country) => country.name === getValues("country"),
        )
        const currentPhone = getValues("phone_number")?.trim()
        if (
          selectedCountry?.dialingCode &&
          currentPhone?.startsWith(selectedCountry.dialingCode)
        ) {
          setValue(
            "phone_number",
            currentPhone.slice(selectedCountry.dialingCode.length).trimStart(),
          )
        }
      })
      .catch(() => {
        // The bundled list remains available if the countries API is unreachable.
      })

    return () => {
      cancelled = true
    }
  }, [getValues, setValue])

  const platformOptions = React.useMemo(() => {
    if (!customPlatforms.length) return STANDARD_PLATFORM_OPTIONS
    return [
      ...STANDARD_PLATFORM_OPTIONS,
      ...customPlatforms.map((p) => ({ value: p, label: p, hint: "Custom" })),
    ]
  }, [customPlatforms])

  const industryComboOptions = React.useMemo(
    () => industryOptions.map((i) => ({ value: i, label: i })),
    [industryOptions],
  )
  const countryOptions = React.useMemo(() => toCountryOptions(countries), [countries])
  const selectedCountry = countries.find(
    (country) => country.name === selectedCountryName,
  )

  function normalizePhoneNumber(value: string | undefined): string | undefined {
    const raw = value?.trim()
    if (!raw) return undefined

    const countryCode = selectedCountry?.code as CountryCode | undefined
    const dialingCode = selectedCountry?.dialingCode
    const digits = raw.replace(/\D/g, "")
    const dialingDigits = dialingCode?.replace(/\D/g, "")
    const internationalInput =
      raw.startsWith("+") || (dialingDigits && digits.startsWith(dialingDigits))
        ? `+${digits}`
        : raw

    const parsed = parsePhoneNumberFromString(internationalInput, countryCode)
    if (parsed) return parsed.number

    if (dialingCode && dialingDigits && !digits.startsWith(dialingDigits)) {
      return `${dialingCode}${digits.replace(/^0+/, "")}`
    }

    return raw
  }

  async function handle(values: FormValues) {
    const result = await onSubmit({
      ...values,
      phone_number: normalizePhoneNumber(values.phone_number),
    } as ProspectCreateInput)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success(prospect ? "Prospect updated" : "Prospect added")
  }

  return (
    <form onSubmit={handleSubmit(handle)} className="flex min-h-0 flex-1 flex-col" noValidate>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
              <Combobox
                options={platformOptions}
                value={field.value}
                onChange={field.onChange}
                placeholder="Pick a platform"
                searchPlaceholder="Search platforms…"
              />
            )}
          />
          {errors.platform && (
            <p className="text-xs text-destructive">{errors.platform.message}</p>
          )}
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
          <Controller
            control={control}
            name="industry"
            render={({ field }) => (
              <Combobox
                options={industryComboOptions}
                value={field.value}
                onChange={field.onChange}
                placeholder="Select an industry…"
                searchPlaceholder="Search industries…"
              />
            )}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="location">Location</Label>
          <Input id="location" placeholder="Tucson, AZ" {...register("location")} />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="country">Country</Label>
        <Controller
          control={control}
          name="country"
          render={({ field }) => (
            <Combobox
              options={countryOptions}
              value={field.value}
              onChange={field.onChange}
              placeholder="Select a country…"
              searchPlaceholder="Search countries…"
            />
          )}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="phone_number">Phone number</Label>
        <div className="flex">
          <div
            className="flex h-8 min-w-16 items-center justify-center rounded-l-lg border border-r-0 border-input bg-muted px-2.5 text-sm text-muted-foreground"
            aria-label="Country dialing code"
          >
            {selectedCountry?.dialingCode ?? "—"}
          </div>
          <Input
            id="phone_number"
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            placeholder={
              selectedCountry?.phoneExample ?? "Select a country, then enter the number"
            }
            className="rounded-l-none"
            {...register("phone_number")}
            aria-invalid={!!errors.phone_number}
          />
        </div>
        {errors.phone_number && (
          <p className="text-xs text-destructive">{errors.phone_number.message}</p>
        )}
      </div>

      <div className="grid gap-2">
        <Label>Campaigns</Label>
        <Controller
          control={control}
          name="campaign_ids"
          render={({ field }) => (
            <CampaignPicker
              options={campaignOptions}
              value={field.value ?? []}
              onChange={field.onChange}
            />
          )}
        />
        <p className="text-[11px] text-muted-foreground">
          Optional. A prospect can belong to more than one campaign.
        </p>
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
      </div>

      <div className="-mx-4 -mb-4 mt-2 flex items-center justify-end gap-2 rounded-b-xl border-t bg-muted/50 px-4 py-3">
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
