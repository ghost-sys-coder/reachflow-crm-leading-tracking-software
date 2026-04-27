"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ImageUpload } from "@/components/settings/image-upload"
import { updateProfile, updateProfileAvatar } from "@/app/actions/profile"
import { createClient } from "@/lib/supabase/client"
import type { Profile } from "@/types/database"

type FormValues = {
  full_name: string
  job_title: string
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
      job_title: profile?.job_title ?? "",
    },
  })

  async function onSubmit(values: FormValues) {
    const result = await updateProfile({
      full_name: values.full_name || undefined,
      job_title: values.job_title || undefined,
    })
    if (result.error !== null) {
      toast.error(result.error)
      return
    }
    toast.success("Profile saved")
    reset({
      full_name: result.data.full_name ?? "",
      job_title: result.data.job_title ?? "",
    })
  }

  async function handleAvatarUpload(file: File) {
    if (!profile?.id) throw new Error("Not authenticated")

    const supabase = createClient()
    const ext = file.type.split("/")[1]
    const path = `${profile.id}/avatar.${ext}`

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type })

    if (uploadError) throw new Error(uploadError.message)

    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path)

    const result = await updateProfileAvatar(publicUrl)
    if (result.error) throw new Error(result.error)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-1.5">
        <Label>Profile photo</Label>
        <ImageUpload
          currentUrl={profile?.avatar_url ?? null}
          fallbackText={profile?.full_name ?? undefined}
          shape="circle"
          label="Photo"
          onUpload={handleAvatarUpload}
        />
      </div>

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

      <div className="grid gap-2">
        <Label htmlFor="job_title">
          Job title{" "}
          <span className="text-xs font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Input
          id="job_title"
          placeholder="e.g. Head of Growth, Account Manager"
          {...register("job_title")}
          aria-invalid={!!errors.job_title}
        />
        {errors.job_title && (
          <p className="text-xs text-destructive">{errors.job_title.message}</p>
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
