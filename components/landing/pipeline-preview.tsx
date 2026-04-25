import { MoreHorizontal, Sparkles } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

type Prospect = {
  name: string
  detail: string
  initials: string
  status: "Sent" | "Waiting" | "Replied" | "Booked"
}

const COLUMNS: Array<{ title: string; count: number; prospects: Prospect[] }> = [
  {
    title: "Sent",
    count: 12,
    prospects: [
      { name: "Calder & Co. Roofing", detail: "Instagram · Denver", initials: "CR", status: "Sent" },
      { name: "Blue Bench Coffee", detail: "Email · Portland", initials: "BB", status: "Sent" },
    ],
  },
  {
    title: "Replied",
    count: 6,
    prospects: [
      { name: "Sam's Plumbing", detail: "Instagram · Tucson", initials: "SP", status: "Replied" },
      { name: "North Harbor Dental", detail: "Email · Seattle", initials: "ND", status: "Replied" },
    ],
  },
  {
    title: "Booked",
    count: 3,
    prospects: [
      { name: "Mason Street Gym", detail: "LinkedIn · Austin", initials: "MS", status: "Booked" },
    ],
  },
]

const STATUS_STYLES: Record<Prospect["status"], string> = {
  Sent: "bg-muted text-muted-foreground",
  Waiting: "bg-muted text-muted-foreground",
  Replied: "bg-primary/15 text-primary",
  Booked: "bg-success text-success-foreground",
}

export function PipelinePreview() {
  return (
    <div className="relative w-full max-w-xl animate-slide-up">
      <div className="absolute -top-4 -right-4 z-10 hidden w-60 rounded-lg border border-border bg-card p-3 shadow-lg md:block">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Sparkles className="size-3 text-primary" />
          AI generated
        </div>
        <p className="mt-1 text-sm leading-relaxed">
          Hey Sam, noticed Sam&apos;s Plumbing only has 12 Google reviews in 8 years. Want the
          3-text flow we use to pull 20+ in a month?
        </p>
      </div>

      <div className="relative rounded-xl border border-border bg-card p-4 shadow-xl">
        <header className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">Pipeline</p>
            <p className="text-xs text-muted-foreground">21 prospects this week</p>
          </div>
          <div className="flex -space-x-1.5">
            <Avatar size="sm">
              <AvatarFallback>AB</AvatarFallback>
            </Avatar>
            <Avatar size="sm">
              <AvatarFallback>CD</AvatarFallback>
            </Avatar>
            <Avatar size="sm">
              <AvatarFallback>EF</AvatarFallback>
            </Avatar>
          </div>
        </header>

        <div className="grid grid-cols-3 gap-2">
          {COLUMNS.map((col) => (
            <div key={col.title} className="rounded-lg bg-muted/50 p-2">
              <div className="mb-2 flex items-center justify-between px-1">
                <span className="text-xs font-medium">{col.title}</span>
                <Badge variant="outline" className="h-4 px-1.5 text-[10px]">
                  {col.count}
                </Badge>
              </div>
              <div className="space-y-2">
                {col.prospects.map((p) => (
                  <div key={p.name} className="rounded-md border border-border bg-background p-2">
                    <div className="flex items-start gap-2">
                      <Avatar size="sm">
                        <AvatarFallback>{p.initials}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium">{p.name}</p>
                        <p className="truncate text-[10px] text-muted-foreground">{p.detail}</p>
                      </div>
                      <MoreHorizontal className="size-3 text-muted-foreground" />
                    </div>
                    <div className="mt-2 flex">
                      <span
                        className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${STATUS_STYLES[p.status]}`}
                      >
                        {p.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
