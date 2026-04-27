"use client"

import * as React from "react"
import Image from "next/image"
import { Camera, Loader2, Upload } from "lucide-react"
import { toast } from "sonner"

const MAX_BYTES = 5 * 1024 * 1024
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"]

export function ImageUpload({
  currentUrl,
  fallbackText,
  shape = "circle",
  label,
  hint,
  onUpload,
  disabled = false,
}: {
  currentUrl: string | null
  fallbackText?: string
  shape?: "circle" | "square"
  label: string
  hint?: string
  onUpload: (file: File) => Promise<void>
  disabled?: boolean
}) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = React.useState(false)
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(currentUrl)

  const initials = fallbackText
    ? fallbackText
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w[0])
        .join("")
        .toUpperCase()
    : null

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!ACCEPTED.includes(file.type)) {
      toast.error("Only JPG, PNG, and WebP images are supported")
      e.target.value = ""
      return
    }

    if (file.size > MAX_BYTES) {
      toast.error("Image must be under 5 MB")
      e.target.value = ""
      return
    }

    const objectUrl = URL.createObjectURL(file)
    setPreviewUrl(objectUrl)
    setUploading(true)

    try {
      await onUpload(file)
      toast.success("Image saved")
    } catch (err) {
      setPreviewUrl(currentUrl)
      toast.error(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setUploading(false)
      URL.revokeObjectURL(objectUrl)
      e.target.value = ""
    }
  }

  const shapeClass = shape === "circle" ? "rounded-full" : "rounded-lg"
  const isDisabled = disabled || uploading

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => !isDisabled && inputRef.current?.click()}
        disabled={isDisabled}
        aria-label={`Change ${label.toLowerCase()}`}
        className={`group relative size-16 shrink-0 overflow-hidden border border-border bg-muted transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-60 ${shapeClass}`}
      >
        {previewUrl ? (
          <Image
            src={previewUrl}
            alt={label}
            fill
            sizes="64px"
            className="object-cover"
            unoptimized={previewUrl.startsWith("blob:")}
          />
        ) : (
          <span className="flex size-full items-center justify-center text-sm font-semibold text-muted-foreground select-none">
            {initials ?? <Upload className="size-4" />}
          </span>
        )}

        <span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
          {uploading ? (
            <Loader2 className="size-4 animate-spin text-white" />
          ) : (
            <Camera className="size-4 text-white" />
          )}
        </span>

        {uploading && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/50">
            <Loader2 className="size-4 animate-spin text-white" />
          </span>
        )}
      </button>

      <div className="space-y-1">
        <button
          type="button"
          onClick={() => !isDisabled && inputRef.current?.click()}
          disabled={isDisabled}
          className="text-sm font-medium text-foreground hover:underline disabled:pointer-events-none disabled:opacity-60"
        >
          {uploading ? "Uploading…" : previewUrl ? `Change ${label.toLowerCase()}` : `Upload ${label.toLowerCase()}`}
        </button>
        <p className="text-xs text-muted-foreground">
          {hint ?? "JPG, PNG or WebP · max 5 MB · optional"}
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        className="sr-only"
        onChange={handleChange}
        disabled={isDisabled}
      />
    </div>
  )
}
