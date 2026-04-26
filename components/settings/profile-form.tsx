"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updateProfile } from "@/app/actions/profile"
import type { Profile } from "@/types/database"

type FormValues = {
  full_name: string
}

export function ProfileForm({ profile }: { profile: Profile | null }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
    reset,
  } = useForm<FormValues>({
    defaultValues: {
      full_name: profile?.full_name ?? "",
    },
  })

  async function onSubmit(values: FormValues) {
    const result = await updateProfile({
      full_name: values.full_name || undefined,
    })
    if (result.error !== null) {
      toast.error(result.error)
      return
    }
    toast.success("Profile saved")
    reset({
      full_name: result.data.full_name ?? "",
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-2">
        <Label htmlFor="full_name">Full name</Label>
        <Input
          id="full_name"
          placeholder="Alex Johnson"
          {...register("full_name")}
          aria-invalid={!!errors.full_name}
        />
        {errors.full_name && (
          <p className="text-xs text-destructive">{errors.full_name.message}</p>
        )}
      </div>

      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={isSubmitting || !isDirty}>
          {isSubmitting ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </form>
  )
}
