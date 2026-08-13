"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BarChart3,
  CalendarCheck,
  LayoutGrid,
  Map,
  Megaphone,
  MessagesSquare,
  Palette,
  ScrollText,
  Settings,
  ListTodo,
  FileClock,
  Users,
  type LucideIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { isRoadmapAuthorizedEmail } from "@/lib/roadmap/access"
import { BrandMark } from "@/components/shared/brand-mark"

type NavItem = {
  label: string
  href: string
  icon: LucideIcon
  match?: (pathname: string) => boolean
}

type NavGroup = {
  label: string
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Workspace",
    items: [
      { label: "Today", href: "/today", icon: CalendarCheck },
      { label: "Tasks", href: "/tasks", icon: ListTodo },
      { label: "Messages", href: "/messages", icon: MessagesSquare },
    ],
  },
  {
    label: "Sales",
    items: [
      { label: "Pipeline", href: "/pipeline", icon: LayoutGrid },
      { label: "Prospects", href: "/prospects", icon: Users },
      { label: "Campaigns", href: "/campaigns", icon: Megaphone },
    ],
  },
  {
    label: "Reporting",
    items: [
      { label: "Analytics", href: "/analytics", icon: BarChart3 },
      { label: "Activity", href: "/activity", icon: ScrollText },
      { label: "Imports", href: "/imports", icon: FileClock },
    ],
  },
  {
    label: "Administration",
    items: [
      { label: "Design system", href: "/design-system", icon: Palette },
      { label: "Settings", href: "/settings", icon: Settings },
    ],
  },
]

export function SidebarNav({
  userEmail,
  userName,
  onNavigate,
  orgName,
  orgLogoUrl,
}: {
  userEmail: string
  userName: string | null
  onNavigate?: () => void
  orgName?: string
  orgLogoUrl?: string
}) {
  const pathname = usePathname()
  const initials = (userName ?? userEmail).slice(0, 2).toUpperCase()
  const navGroups = isRoadmapAuthorizedEmail(userEmail)
    ? NAV_GROUPS.map((group) => group.label === "Administration"
      ? { ...group, items: [...group.items, { label: "Roadmap", href: "/roadmap", icon: Map }] }
      : group)
    : NAV_GROUPS

  return (
    <div className="flex h-full flex-col gap-6 overflow-hidden rounded-2xl border border-white/70 bg-card shadow-[0_18px_55px_-32px_oklch(0.25_0.04_260/0.45)] dark:border-white/8">
      <div className="px-4 pt-5">
        <Link href="/pipeline" onClick={onNavigate} aria-label={orgName ?? "ReachFlow"}>
          <BrandMark size="md" orgName={orgName} orgLogoUrl={orgLogoUrl} />
        </Link>
      </div>

      <nav className="min-h-0 flex-1 space-y-5 overflow-y-auto px-2 pb-2" aria-label="Primary">
        {navGroups.map((group) => (
          <section key={group.label} aria-labelledby={`nav-${group.label.toLowerCase()}`}>
            <h2 id={`nav-${group.label.toLowerCase()}`} className="mb-1 px-3 text-[10px] font-semibold tracking-[0.12em] text-muted-foreground/70 uppercase">
              {group.label}
            </h2>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = item.match
                  ? item.match(pathname)
                  : pathname === item.href || pathname.startsWith(`${item.href}/`)

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                      active
                        ? "bg-primary/10 font-medium text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <item.icon className="size-4 shrink-0" />
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </section>
        ))}
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
  orgName,
  orgLogoUrl,
}: {
  userEmail: string
  userName: string | null
  orgName?: string
  orgLogoUrl?: string
}) {
  return (
    <aside className="hidden w-60 shrink-0 lg:block">
      <SidebarNav
        userEmail={userEmail}
        userName={userName}
        orgName={orgName}
        orgLogoUrl={orgLogoUrl}
      />
    </aside>
  )
}
