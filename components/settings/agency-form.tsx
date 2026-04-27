"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ImageUpload } from "@/components/settings/image-upload"
import { updateAgencyProfile, updateOrgLogo } from "@/app/actions/profile"
import { createClient } from "@/lib/supabase/client"
import type { Organization } from "@/types/database"

type FormValues = {
  agency_name: string
  sender_name: string
  agency_website: string
  agency_value_props: string
  agency_services_text: string
}

function servicesArrayToText(services: string[] | null | undefined): string {
  return (services ?? []).join(", ")
}

function servicesTextToArray(text: string): string[] {
  return text
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .slice(0, 12)
}

export function AgencyForm({ org }: { org: Organization | null }) {
  const router = useRouter()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
    reset,
  } = useForm<FormValues>({
    defaultValues: {
      agency_name: org?.agency_name ?? "",
      sender_name: org?.sender_name ?? "",
      agency_website: org?.agency_website ?? "",
      agency_value_props: org?.agency_value_props ?? "",
      agency_services_text: servicesArrayToText(org?.agency_services),
    },
  })

  async function handleLogoUpload(file: File) {
    if (!org?.id) throw new Error("No organisation found")

    const supabase = createClient()
    const ext = file.type.split("/")[1]
    const path = `${org.id}/logo.${ext}`

    const { error: uploadError } = await supabase.storage
      .from("logos")
      .upload(path, file, { upsert: true, contentType: file.type })

    if (uploadError) throw new Error(uploadError.message)

    const { data: { publicUrl } } = supabase.storage.from("logos").getPublicUrl(path)

    const result = await updateOrgLogo(publicUrl)
    if (result.error) throw new Error(result.error)
  }

  async function onSubmit(values: FormValues) {
    const result = await updateAgencyProfile({
      agency_name: values.agency_name || undefined,
      sender_name: values.sender_name || undefined,
      agency_website: values.agency_website || undefined,
      agency_value_props: values.agency_value_props || undefined,
      agency_services: servicesTextToArray(values.agency_services_text),
    })

    if (result.error !== null) {
      toast.error(result.error)
      return
    }

    toast.success("Agency profile saved")
    reset({
      agency_name: result.data.agency_name ?? "",
      sender_name: result.data.sender_name ?? "",
      agency_website: result.data.agency_website ?? "",
      agency_value_props: result.data.agency_value_props ?? "",
      agency_services_text: servicesArrayToText(result.data.agency_services),
    })
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-1.5">
        <Label>Agency logo</Label>
        <ImageUpload
          currentUrl={org?.logo_url ?? null}
          fallbackText={org?.agency_name ?? undefined}
          shape="square"
          label="Logo"
          hint="JPG, PNG or WebP · max 5 MB · optional · shown in your workspace"
          onUpload={handleLogoUpload}
          disabled={false}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="agency_name">
          Agency name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="agency_name"
          placeholder="VeilCode"
          {...register("agency_name", { required: "Agency name is required" })}
          aria-invalid={!!errors.agency_name}
        />
        {errors.agency_name && (
          <p className="text-xs text-destructive">{errors.agency_name.message}</p>
        )}
        <p className="text-[11px] text-muted-foreground">
          Injected into every generated outreach message.
        </p>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="sender_name">Sender name</Label>
        <Input
          id="sender_name"
          placeholder="Alex Johnson"
          {...register("sender_name")}
        />
        <p className="text-[11px] text-muted-foreground">
          Used as the sign-off on cold emails.
        </p>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="agency_website">Agency website</Label>
        <Input
          id="agency_website"
          type="url"
          placeholder="https://veilcode.co"
          {...register("agency_website")}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="agency_services_text">Services offered</Label>
        <Input
          id="agency_services_text"
          placeholder="Web design, SEO, Paid ads"
          {...register("agency_services_text")}
        />
        <p className="text-[11px] text-muted-foreground">
          Comma-separated list. Up to 12 services.
        </p>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="agency_value_props">Value proposition</Label>
        <Textarea
          id="agency_value_props"
          rows={4}
          placeholder="We build conversion-focused sites for home-service businesses in 10 days or less, with measurable lead-gen results."
          {...register("agency_value_props")}
        />
        <p className="text-[11px] text-muted-foreground">
          What the agency does best. The model uses this when framing the pitch.
        </p>
      </div>

      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={isSubmitting || !isDirty}>
          {isSubmitting ? "Saving..." : "Save agency profile"}
        </Button>
      </div>
    </form>
  )
}
