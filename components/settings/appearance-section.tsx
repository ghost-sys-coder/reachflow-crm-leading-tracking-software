"use client"

import * as React from "react"
import { Moon, Palette, Sun } from "lucide-react"
import { toast } from "sonner"

import { updateThemePreference } from "@/app/actions/profile"
import { useTheme } from "@/hooks/use-theme"
import { cn } from "@/lib/utils"
import type { Theme } from "@/components/shared/theme-provider"

const THEME_OPTIONS: Array<{
  value: Theme
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  swatches: string[]
}> = [
  {
    value: "default",
    label: "Default",
    description: "Clean light interface",
    icon: Sun,
    swatches: ["bg-white", "bg-primary", "bg-muted"],
  },
  {
    value: "midnight",
    label: "Midnight",
    description: "Deep dark environment",
    icon: Moon,
    swatches: ["bg-[#0f1117]", "bg-[#6366f1]", "bg-[#1e2130]"],
  },
  {
    value: "sunset",
    label: "Sunset",
    description: "Warm amber tones",
    icon: Palette,
    swatches: ["bg-[#fdf6ec]", "bg-[#e07b39]", "bg-[#f5e6d0]"],
  },
]

export function AppearanceSection({
  savedTheme,
}: {
  savedTheme: Theme
}) {
  const { theme, setTheme } = useTheme()
  const [isPending, startTransition] = React.useTransition()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const activeTheme = mounted ? theme : savedTheme

  function handleSelect(next: Theme) {
    setTheme(next)
    startTransition(async () => {
      const result = await updateThemePreference({ theme_preference: next })
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(`Theme set to ${THEME_OPTIONS.find((t) => t.value === next)?.label}`)
      }
    })
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Choose a theme for your ReachFlow workspace. Your preference is saved to your profile.
      </p>

      <div className="grid gap-3 sm:grid-cols-3">
        {THEME_OPTIONS.map((opt) => {
          const Icon = opt.icon
          const isActive = activeTheme === opt.value

          return (
            <button
              key={opt.value}
              type="button"
              disabled={isPending}
              onClick={() => handleSelect(opt.value)}
              className={cn(
                "group relative flex flex-col overflow-hidden rounded-xl border-2 text-left transition-all",
                isActive
                  ? "border-primary shadow-md"
                  : "border-border hover:border-primary/40 hover:shadow-sm",
              )}
            >
              {/* Preview swatch strip */}
              <div className="flex h-16 items-stretch overflow-hidden">
                {opt.swatches.map((swatch, i) => (
                  <div key={i} className={cn("flex-1", swatch)} />
                ))}
              </div>

              {/* Label area */}
              <div className="flex items-start gap-2 p-3">
                <Icon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-none">{opt.label}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {opt.description}
                  </p>
                </div>

                {isActive && (
                  <span className="ml-auto inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-primary">
                    <svg
                      viewBox="0 0 10 10"
                      className="size-2.5 text-primary-foreground"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <polyline points="1.5,5 4,7.5 8.5,2.5" />
                    </svg>
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
