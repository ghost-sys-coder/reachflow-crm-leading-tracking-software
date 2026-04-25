"use client"

import * as React from "react"
import { Monitor, Moon, Palette, Sun } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTheme } from "@/hooks/use-theme"
import { type Theme } from "@/components/shared/theme-provider"

const THEME_META: Record<Theme, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  default: { label: "Default", icon: Sun },
  midnight: { label: "Midnight", icon: Moon },
  sunset: { label: "Sunset", icon: Palette },
}

export function ThemeSwitcher() {
  const { theme, setTheme, themes } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const ActiveIcon = mounted ? THEME_META[theme].icon : Monitor

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" aria-label="Change theme">
          <ActiveIcon className="size-3.5" data-icon="inline-start" />
          <span>{mounted ? THEME_META[theme].label : "Theme"}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={mounted ? theme : ""}
          onValueChange={(v) => setTheme(v as Theme)}
        >
          {themes.map((t) => {
            const Icon = THEME_META[t].icon
            return (
              <DropdownMenuRadioItem key={t} value={t}>
                <Icon className="size-3.5" />
                {THEME_META[t].label}
              </DropdownMenuRadioItem>
            )
          })}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => setTheme("default")}>
          Reset to default
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
