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
  { match: /^\/today/, title: "Today" },
  { match: /^\/pipeline/, title: "Pipeline" },
  { match: /^\/prospects/, title: "Prospects" },
  { match: /^\/campaigns/, title: "Campaigns" },
  { match: /^\/messages/, title: "Messages" },
  { match: /^\/activity/, title: "Activity Log" },
  { match: /^\/tasks/, title: "Tasks" },
  { match: /^\/imports/, title: "Import history" },
  { match: /^\/settings/, title: "Settings" },
  { match: /^\/roadmap/, title: "Implementation roadmap" },
  { match: /^\/design-system/, title: "Design system" },
]

function resolveTitle(pathname: string, orgName?: string) {
  return PAGE_TITLES.find((p) => p.match.test(pathname))?.title ?? orgName ?? "ReachFlow"
}

export function Topbar({
  userEmail,
  userName,
  orgName,
  orgLogoUrl,
}: {
  userEmail: string
  userName: string | null
  orgName?: string
  orgLogoUrl?: string
}) {
  const pathname = usePathname()
  const title = resolveTitle(pathname, orgName)

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-border/70 bg-background/80 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
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
          <SidebarNav
            userEmail={userEmail}
            userName={userName}
            orgName={orgName}
            orgLogoUrl={orgLogoUrl}
          />
        </SheetContent>
      </Sheet>

      <div><p className="text-[10px] font-medium tracking-[0.14em] text-muted-foreground uppercase">Workspace</p><h1 className="mt-0.5 text-base font-semibold tracking-tight">{title}</h1></div>

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
