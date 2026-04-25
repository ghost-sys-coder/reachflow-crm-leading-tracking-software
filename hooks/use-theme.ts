"use client"

import { useTheme as useNextTheme } from "next-themes"
import { THEMES, type Theme } from "@/components/shared/theme-provider"

//narrows next-themes' string API to our Theme union
export function useTheme() {
  const { theme, setTheme, ...rest } = useNextTheme()

  const activeTheme: Theme =
    theme && (THEMES as readonly string[]).includes(theme) ? (theme as Theme) : "default"

  return {
    ...rest,
    theme: activeTheme,
    setTheme: (next: Theme) => setTheme(next),
    themes: THEMES,
  }
}
