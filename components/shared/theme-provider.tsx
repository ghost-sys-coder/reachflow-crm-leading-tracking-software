"use client"

import { ThemeProvider as NextThemesProvider } from "next-themes"

export const THEMES = ["default", "midnight", "sunset"] as const
export type Theme = (typeof THEMES)[number]
export const THEME_STORAGE_KEY = "reachflow-theme"

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="data-theme"
      defaultTheme="default"
      themes={[...THEMES]}
      storageKey={THEME_STORAGE_KEY}
      enableSystem={false}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  )
}
