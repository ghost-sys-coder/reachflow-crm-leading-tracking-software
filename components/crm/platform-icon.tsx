import { AtSign, Globe } from "lucide-react"

import { cn } from "@/lib/utils"
import type { Platform } from "@/db/schema"

type IconComponent = (props: React.SVGProps<SVGSVGElement>) => React.JSX.Element

//lucide v1 removed the brand icons (Twitter, Instagram, Facebook,
//Linkedin). We hand-roll minimal marks that match the lucide
//stroke style so the CRM keeps consistent iconography.
const makeIcon =
  (children: React.ReactNode, { fill = false }: { fill?: boolean } = {}): IconComponent =>
  (props) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill={fill ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </svg>
  )

const InstagramIcon = makeIcon(
  <>
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17" cy="7" r="1" fill="currentColor" />
  </>,
)

const FacebookIcon = makeIcon(
  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />,
)

const LinkedInIcon = makeIcon(
  <>
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 1 0-4 0v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect x="2" y="9" width="4" height="12" />
    <circle cx="4" cy="4" r="2" />
  </>,
)

const XMark = makeIcon(
  <>
    <path d="M4 4l16 16" />
    <path d="M20 4L4 20" />
  </>,
)

const PLATFORM_META: Record<Platform, { label: string; icon: IconComponent }> = {
  instagram: { label: "Instagram", icon: InstagramIcon },
  email: { label: "Email", icon: AtSign as unknown as IconComponent },
  facebook: { label: "Facebook", icon: FacebookIcon },
  linkedin: { label: "LinkedIn", icon: LinkedInIcon },
  twitter: { label: "X / Twitter", icon: XMark },
  other: { label: "Other", icon: Globe as unknown as IconComponent },
}

export const PLATFORM_LABELS = Object.fromEntries(
  Object.entries(PLATFORM_META).map(([k, v]) => [k, v.label]),
) as Record<Platform, string>

export function PlatformIcon({
  platform,
  className,
  withLabel = false,
}: {
  platform: Platform
  className?: string
  withLabel?: boolean
}) {
  const meta = PLATFORM_META[platform]
  const Icon = meta.icon

  if (!withLabel) {
    return <Icon className={cn("size-3.5", className)} aria-label={meta.label} />
  }

  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs", className)}>
      <Icon className="size-3.5" />
      <span>{meta.label}</span>
    </span>
  )
}
