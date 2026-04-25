import { cn } from "@/lib/utils"

type BrandMarkProps = {
  className?: string
  showWordmark?: boolean
  size?: "sm" | "md" | "lg"
}

const SIZES = {
  sm: { icon: "size-6", text: "text-sm" },
  md: { icon: "size-8", text: "text-base" },
  lg: { icon: "size-10", text: "text-lg" },
}

export function BrandMark({ className, showWordmark = true, size = "md" }: BrandMarkProps) {
  const s = SIZES[size]

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span
        aria-hidden
        className={cn(
          s.icon,
          "relative inline-flex items-center justify-center overflow-hidden rounded-lg bg-primary text-primary-foreground ring-1 ring-border",
        )}
      >
        <svg viewBox="0 0 24 24" fill="none" className="size-3/5">
          <path
            d="M4 7c0-.6.4-1 1-1h8a5 5 0 0 1 5 5 5 5 0 0 1-5 5H8l-4 3V7Z"
            fill="currentColor"
            opacity="0.25"
          />
          <path
            d="M4 7c0-.6.4-1 1-1h8a5 5 0 0 1 5 5 5 5 0 0 1-5 5H8"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="m14 9 3 2-3 2"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      {showWordmark && (
        <span className={cn(s.text, "font-semibold tracking-tight")}>ReachFlow</span>
      )}
    </div>
  )
}
