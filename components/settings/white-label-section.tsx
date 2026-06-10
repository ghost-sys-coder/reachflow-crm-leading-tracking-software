"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updateWhiteLabelSettings } from "@/app/actions/profile"
import type { Organization } from "@/types/database"

type FormValues = {
  white_label_enabled: boolean
  brand_primary_color: string
  brand_accent_color: string
}

export function WhiteLabelSection({ org }: { org: Organization | null }) {
  const router = useRouter()
  const { control, handleSubmit, setValue, watch, formState: { isSubmitting, isDirty } } =
    useForm<FormValues>({
      defaultValues: {
        white_label_enabled: org?.white_label_enabled ?? false,
        brand_primary_color: org?.brand_primary_color ?? "#4f46e5",
        brand_accent_color: org?.brand_accent_color ?? "#4f46e5",
      },
    })

  const enabled = watch("white_label_enabled")
  const primaryColor = watch("brand_primary_color")

  async function onSubmit(values: FormValues) {
    const result = await updateWhiteLabelSettings({
      white_label_enabled: values.white_label_enabled,
      brand_primary_color: values.white_label_enabled ? (values.brand_primary_color || null) : null,
      brand_accent_color: values.white_label_enabled ? (values.brand_accent_color || null) : null,
    })
    if (result.error !== null) {
      toast.error(result.error)
      return
    }
    toast.success("White-label settings saved")
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Toggle */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium">Enable white-label branding</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Replace &ldquo;ReachFlow&rdquo; with your own logo and agency name in the app
            shell and emails.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={() => setValue("white_label_enabled", !enabled, { shouldDirty: true })}
          className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
            enabled ? "bg-primary" : "bg-input"
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
              enabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {/* Color pickers */}
      <fieldset
        disabled={!enabled}
        className="space-y-4 disabled:pointer-events-none disabled:opacity-50"
      >
        <legend className="sr-only">Brand colors</legend>

        <Controller
          name="brand_primary_color"
          control={control}
          render={({ field }) => (
            <div className="grid gap-1.5">
              <Label>Brand color</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                  className="size-8 cursor-pointer rounded border border-border bg-transparent p-0.5"
                  aria-label="Brand color swatch"
                />
                <Input
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                  placeholder="#4f46e5"
                  className="w-32 font-mono text-sm"
                  aria-label="Brand color hex"
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Sets the primary color across buttons, active nav links, and pipeline tags.
              </p>
            </div>
          )}
        />

        <Controller
          name="brand_accent_color"
          control={control}
          render={({ field }) => (
            <div className="grid gap-1.5">
              <Label>Accent color</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                  className="size-8 cursor-pointer rounded border border-border bg-transparent p-0.5"
                  aria-label="Accent color swatch"
                />
                <Input
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                  placeholder="#4f46e5"
                  className="w-32 font-mono text-sm"
                  aria-label="Accent color hex"
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Used for secondary highlights and hover states.
              </p>
            </div>
          )}
        />
      </fieldset>

      {/* Live preview */}
      {enabled && (
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Sidebar preview
          </p>
          <div
            className="overflow-hidden rounded-lg border border-border bg-card"
            style={{ width: 168 }}
          >
            <div className="flex items-center gap-1.5 border-b border-border px-3 py-2.5">
              <span
                className="inline-flex size-5 shrink-0 items-center justify-center overflow-hidden rounded text-[8px] font-bold text-white"
                style={{ background: primaryColor }}
              >
                {org?.agency_name ? org.agency_name[0].toUpperCase() : "A"}
              </span>
              <span className="truncate text-[11px] font-semibold">
                {org?.agency_name ?? "Your Agency"}
              </span>
            </div>
            <div className="space-y-0.5 p-2">
              {(["Pipeline", "Prospects", "Settings"] as const).map((item, i) => (
                <div
                  key={item}
                  className="flex items-center gap-1.5 rounded px-2 py-1 text-[10px]"
                  style={
                    i === 0
                      ? { background: `${primaryColor}20`, color: primaryColor }
                      : { color: "#6b7280" }
                  }
                >
                  <span
                    className="inline-block size-1.5 shrink-0 rounded-sm"
                    style={{ background: i === 0 ? primaryColor : "#d1d5db" }}
                  />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={isSubmitting || !isDirty}>
          {isSubmitting ? "Saving..." : "Save branding"}
        </Button>
      </div>
    </form>
  )
}
