import Link from "next/link"

import { BrandMark } from "@/components/shared/brand-mark"

const FOOTER_GROUPS: Array<{
  heading: string
  links: Array<{ label: string; href: string }>
}> = [
  {
    heading: "Product",
    links: [
      { label: "Features", href: "#features" },
      { label: "Pricing", href: "#pricing" },
      { label: "Changelog", href: "#changelog" },
      { label: "Roadmap", href: "#roadmap" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About", href: "#" },
      { label: "Customers", href: "#" },
      { label: "Blog", href: "#" },
      { label: "Careers", href: "#" },
    ],
  },
  {
    heading: "Resources",
    links: [
      { label: "Docs", href: "#" },
      { label: "Outreach playbook", href: "#" },
      { label: "Community", href: "#" },
      { label: "Support", href: "#" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Terms", href: "#" },
      { label: "Privacy", href: "#" },
      { label: "DPA", href: "#" },
      { label: "Security", href: "#" },
    ],
  },
]

export function LandingFooter() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-10 md:grid-cols-[1.3fr_repeat(4,1fr)]">
          <div className="space-y-3">
            <BrandMark size="md" />
            <p className="max-w-sm text-sm text-muted-foreground">
              The CRM built for digital agencies running cold outreach. Keep the pipeline clean,
              personalize at scale, and never lose a warm lead again.
            </p>
          </div>
          {FOOTER_GROUPS.map((group) => (
            <div key={group.heading} className="space-y-3">
              <p className="text-xs font-semibold tracking-wider text-foreground uppercase">
                {group.heading}
              </p>
              <ul className="space-y-2">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <p>&copy; {new Date().getFullYear()} ReachFlow. Built for agencies, everywhere.</p>
          <p>
            Made with care in <span className="text-foreground">Kampala</span> and beyond.
          </p>
        </div>
      </div>
    </footer>
  )
}
