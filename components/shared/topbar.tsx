"use client"

import { usePathname } from "next/navigation"
import { Menu } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { SidebarNav } from "@/components/shared/sidebar"
import { ThemeSwitcher } from "@/components/shared/theme-switcher"
import { UserMenu } from "@/components/shared/user-menu"
import { NotificationsBell } from "@/components/shared/notifications-bell"

const PAGE_TITLES: Array<{ match: RegExp; title: string }> = [
  { match: /^\/pipeline/, title: "Pipeline" },
  { match: /^\/prospects/, title: "Prospects" },
  { match: /^\/messages/, title: "Messages" },
  { match: /^\/activity/, title: "Activity Log" },
  { match: /^\/settings/, title: "Settings" },
  { match: /^\/design-system/, title: "Design system" },
]

function resolveTitle(pathname: string) {
  return PAGE_TITLES.find((p) => p.match.test(pathname))?.title ?? "ReachFlow"
}

export function Topbar({
  userEmail,
  userName,
}: {
  userEmail: string
  userName: string | null
}) {
  const pathname = usePathname()
  const title = resolveTitle(pathname)

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur sm:px-6">
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label="Open navigation"
          >
            <Menu />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarNav userEmail={userEmail} userName={userName} />
        </SheetContent>
      </Sheet>

      <h1 className="text-sm font-medium">{title}</h1>

      <div className="ml-auto flex items-center gap-2">
        <ThemeSwitcher />
        <NotificationsBell />
        <UserMenu
          userEmail={userEmail}
          userName={userName}
        />
      </div>
    </header>
  )
}
