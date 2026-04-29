"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BarChart3,
  LayoutGrid,
  MessagesSquare,
  Palette,
  ScrollText,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { BrandMark } from "@/components/shared/brand-mark"

type NavItem = {
  label: string
  href: string
  icon: LucideIcon
  match?: (pathname: string) => boolean
}

const NAV_ITEMS: NavItem[] = [
  { label: "Pipeline",      href: "/pipeline",      icon: LayoutGrid    },
  { label: "Prospects",     href: "/prospects",     icon: Users         },
  { label: "Analytics",     href: "/analytics",     icon: BarChart3     },
  { label: "Messages",      href: "/messages",      icon: MessagesSquare },
  { label: "Activity",      href: "/activity",      icon: ScrollText    },
  { label: "Design system", href: "/design-system", icon: Palette       },
  { label: "Settings",      href: "/settings",      icon: Settings      },
]

export function SidebarNav({
  userEmail,
  userName,
  onNavigate,
}: {
  userEmail: string
  userName: string | null
  onNavigate?: () => void
}) {
  const pathname = usePathname()
  const initials = (userName ?? userEmail).slice(0, 2).toUpperCase()

  return (
    <div className="flex h-full flex-col gap-6 border-r border-border bg-card">
      <div className="px-4 pt-5">
        <Link href="/pipeline" onClick={onNavigate} aria-label="ReachFlow">
          <BrandMark size="md" />
        </Link>
      </div>

      <nav className="flex-1 space-y-0.5 px-2" aria-label="Primary">
        {NAV_ITEMS.map((item) => {
          const active = item.match
            ? item.match(pathname)
            : pathname === item.href || pathname.startsWith(`${item.href}/`)

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-border px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex size-8 items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground">
            {initials}
          </span>
          <div className="min-w-0 flex-1 text-xs">
            {userName && <p className="truncate font-medium">{userName}</p>}
            <p className="truncate text-muted-foreground">{userEmail}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export function DesktopSidebar({
  userEmail,
  userName,
}: {
  userEmail: string
  userName: string | null
}) {
  return (
    <aside className="hidden w-60 shrink-0 lg:block">
      <SidebarNav userEmail={userEmail} userName={userName} />
    </aside>
  )
}
