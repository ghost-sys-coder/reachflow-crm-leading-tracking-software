import { cn } from "@/lib/utils"

const TAG_COLORS: Record<string, string> = {
  gray: "bg-muted text-muted-foreground ring-border",
  blue: "bg-primary/10 text-primary ring-primary/25",
  green: "bg-success/15 text-success ring-success/30",
  amber: "bg-warning/15 text-warning ring-warning/30",
  coral: "bg-destructive/10 text-destructive ring-destructive/25",
  red: "bg-destructive/10 text-destructive ring-destructive/25",
  purple: "bg-accent text-accent-foreground ring-border",
}

export const TAG_COLOR_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "gray", label: "Gray" },
  { value: "blue", label: "Blue" },
  { value: "green", label: "Green" },
  { value: "amber", label: "Amber" },
  { value: "coral", label: "Coral" },
  { value: "purple", label: "Purple" },
]

export function TagPill({
  name,
  color = "gray",
  className,
  onRemove,
}: {
  name: string
  color?: string | null
  className?: string
  onRemove?: () => void
}) {
  const colorClass = TAG_COLORS[color ?? "gray"] ?? TAG_COLORS.gray

  return (
    <span
      className={cn(
        "inline-flex h-5 items-center gap-1 rounded-full px-2 text-[11px] font-medium ring-1 ring-inset",
        colorClass,
        className,
      )}
    >
      {name}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${name}`}
          className="-mr-0.5 inline-flex size-3 items-center justify-center rounded-full opacity-70 hover:opacity-100"
        >
          ×
        </button>
      )}
    </span>
  )
}
