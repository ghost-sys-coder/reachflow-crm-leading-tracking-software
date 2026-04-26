"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { completeOnboarding } from "@/app/onboarding/actions"

type FormValues = {
  agency_name: string
  sender_name: string
}

export function OnboardingForm() {
  const router = useRouter()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: { agency_name: "", sender_name: "" },
  })

  async function onSubmit(values: FormValues) {
    const result = await completeOnboarding({
      agency_name: values.agency_name,
      sender_name: values.sender_name || undefined,
    })

    if (result.error) {
      toast.error(result.error)
      return
    }

    router.push("/pipeline")
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid gap-2">
        <Label htmlFor="agency_name">
          Agency name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="agency_name"
          placeholder="VeilCode Agency"
          autoFocus
          {...register("agency_name", { required: "Agency name is required" })}
          aria-invalid={!!errors.agency_name}
        />
        {errors.agency_name && (
          <p className="text-xs text-destructive">{errors.agency_name.message}</p>
        )}
        <p className="text-[11px] text-muted-foreground">
          Used in every AI-generated message. Make it recognisable.
        </p>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="sender_name">Your name</Label>
        <Input
          id="sender_name"
          placeholder="Alex Johnson"
          {...register("sender_name")}
        />
        <p className="text-[11px] text-muted-foreground">
          Used as the sign-off on cold emails. Optional — you can add it in Settings later.
        </p>
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Setting up…" : "Get started"}
      </Button>
    </form>
  )
}
