"use client"

import * as React from "react"
import { Check, ChevronDown, MoreHorizontal, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Avatar, AvatarFallback, AvatarGroup } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { ThemeSwitcher } from "@/components/shared/theme-switcher"

const PALETTE: Array<{ name: string; bg: string; fg?: string }> = [
  { name: "background", bg: "bg-background", fg: "text-foreground" },
  { name: "foreground", bg: "bg-foreground", fg: "text-background" },
  { name: "card", bg: "bg-card", fg: "text-card-foreground" },
  { name: "primary", bg: "bg-primary", fg: "text-primary-foreground" },
  { name: "secondary", bg: "bg-secondary", fg: "text-secondary-foreground" },
  { name: "muted", bg: "bg-muted", fg: "text-muted-foreground" },
  { name: "accent", bg: "bg-accent", fg: "text-accent-foreground" },
  { name: "destructive", bg: "bg-destructive", fg: "text-destructive-foreground" },
  { name: "success", bg: "bg-success", fg: "text-success-foreground" },
  { name: "warning", bg: "bg-warning", fg: "text-warning-foreground" },
  { name: "border", bg: "bg-border" },
]

const TYPE_SCALE: Array<{ size: string; className: string; label: string }> = [
  { size: "xs", className: "text-xs", label: "12 / extra small" },
  { size: "sm", className: "text-sm", label: "13 / small" },
  { size: "base", className: "text-base", label: "14 / body" },
  { size: "md", className: "text-md", label: "15 / medium" },
  { size: "lg", className: "text-lg", label: "16 / large" },
  { size: "xl", className: "text-xl", label: "18 / xl" },
  { size: "2xl", className: "text-2xl", label: "22 / 2xl" },
  { size: "3xl", className: "text-3xl", label: "28 / 3xl" },
  { size: "4xl", className: "text-4xl", label: "36 / 4xl" },
]

export default function DesignSystemPage() {
  return (
    <div className="space-y-12">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Design system</h1>
          <p className="text-sm text-muted-foreground">
            Preview every base component across all three themes.
          </p>
        </div>
        <ThemeSwitcher />
      </header>

      <Section title="Color palette" description="Semantic tokens. Background pair on the left, label centered, foreground pair on the right.">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {PALETTE.map((c) => (
            <div
              key={c.name}
              className={`flex h-20 items-center justify-between rounded-lg border border-border px-3 ${c.bg} ${c.fg ?? "text-foreground"}`}
            >
              <span className="text-xs font-medium">{c.name}</span>
              <span className="font-mono text-xs opacity-70">--color-{c.name}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Typography" description="Scale from xs (12px) to 4xl (36px). Heading family and body family both map to Inter.">
        <div className="space-y-3">
          {TYPE_SCALE.map((t) => (
            <div key={t.size} className="flex items-baseline gap-6">
              <span className="w-16 font-mono text-xs text-muted-foreground">{t.size}</span>
              <span className={`${t.className} font-medium`}>The quick brown fox jumps</span>
              <span className="ml-auto text-xs text-muted-foreground">{t.label}</span>
            </div>
          ))}
          <Separator className="my-4" />
          <div className="flex items-baseline gap-6">
            <span className="w-16 font-mono text-xs text-muted-foreground">mono</span>
            <span className="font-mono text-base">const theme = &quot;sunset&quot;;</span>
          </div>
          <div className="flex items-baseline gap-6">
            <span className="w-16 font-mono text-xs text-muted-foreground">400</span>
            <span className="text-base font-normal">Regular weight body text</span>
          </div>
          <div className="flex items-baseline gap-6">
            <span className="w-16 font-mono text-xs text-muted-foreground">500</span>
            <span className="text-base font-medium">Medium weight body text</span>
          </div>
          <div className="flex items-baseline gap-6">
            <span className="w-16 font-mono text-xs text-muted-foreground">600</span>
            <span className="text-base font-semibold">Semibold weight body text</span>
          </div>
        </div>
      </Section>

      <Section title="Buttons" description="All variants and sizes.">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button>Default</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="link">Link</Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="xs">Extra small</Button>
            <Button size="sm">Small</Button>
            <Button size="default">Default</Button>
            <Button size="lg">Large</Button>
            <Button size="icon" aria-label="Add">
              <Plus />
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button disabled>Disabled</Button>
            <Button variant="outline" disabled>
              Disabled
            </Button>
          </div>
        </div>
      </Section>

      <Section title="Form controls">
        <div className="grid max-w-2xl gap-6">
          <div className="grid gap-2">
            <Label htmlFor="ds-email">Email</Label>
            <Input id="ds-email" type="email" placeholder="founder@agency.com" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ds-notes">Notes</Label>
            <Textarea id="ds-notes" placeholder="Anything important to remember about this prospect..." rows={4} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ds-platform">Platform</Label>
            <Select>
              <SelectTrigger id="ds-platform" className="w-full">
                <SelectValue placeholder="Pick a platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="linkedin">LinkedIn</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ds-invalid">Invalid state</Label>
            <Input id="ds-invalid" defaultValue="not-an-email" aria-invalid />
            <p className="text-sm text-destructive">Enter a valid email address.</p>
          </div>
        </div>
      </Section>

      <Section title="Cards">
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Pipeline summary</CardTitle>
              <CardDescription>24 prospects, 6 booked calls this month.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <Stat label="Total" value="24" />
                <Stat label="Replied" value="9" />
                <Stat label="Booked" value="6" />
              </div>
            </CardContent>
            <CardFooter>
              <Button size="sm" variant="outline">
                View pipeline
              </Button>
            </CardFooter>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Prospect note</CardTitle>
              <CardDescription>Warm lead from Thursday</CardDescription>
            </CardHeader>
            <CardContent>
              <p>
                Sam runs a small HVAC shop in Tucson, mentioned they struggle to get reviews on
                Google. Follow up about the AI review request flow.
              </p>
            </CardContent>
          </Card>
        </div>
      </Section>

      <Section title="Badges">
        <div className="flex flex-wrap gap-2">
          <Badge>Sent</Badge>
          <Badge variant="secondary">Waiting</Badge>
          <Badge variant="outline">Replied</Badge>
          <Badge variant="destructive">Dead</Badge>
          <Badge variant="ghost">Draft</Badge>
          <Badge className="bg-success text-success-foreground">Booked</Badge>
          <Badge className="bg-warning text-warning-foreground">Caution</Badge>
        </div>
      </Section>

      <Section title="Tabs">
        <Tabs defaultValue="prospects" className="max-w-xl">
          <TabsList>
            <TabsTrigger value="prospects">Prospects</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
          </TabsList>
          <TabsContent value="prospects" className="rounded-lg border border-border p-4 text-sm">
            List of prospects would render here.
          </TabsContent>
          <TabsContent value="messages" className="rounded-lg border border-border p-4 text-sm">
            Outreach message history.
          </TabsContent>
          <TabsContent value="metrics" className="rounded-lg border border-border p-4 text-sm">
            Pipeline metrics and reply rates.
          </TabsContent>
        </Tabs>
      </Section>

      <Section title="Avatars">
        <div className="flex items-center gap-6">
          <Avatar size="sm">
            <AvatarFallback>JB</AvatarFallback>
          </Avatar>
          <Avatar>
            <AvatarFallback>AB</AvatarFallback>
          </Avatar>
          <Avatar size="lg">
            <AvatarFallback>SD</AvatarFallback>
          </Avatar>
          <AvatarGroup>
            <Avatar>
              <AvatarFallback>AB</AvatarFallback>
            </Avatar>
            <Avatar>
              <AvatarFallback>CD</AvatarFallback>
            </Avatar>
            <Avatar>
              <AvatarFallback>EF</AvatarFallback>
            </Avatar>
          </AvatarGroup>
        </div>
      </Section>

      <Section title="Overlays and menus">
        <div className="flex flex-wrap items-center gap-3">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">Open dialog</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete prospect</DialogTitle>
                <DialogDescription>
                  This permanently removes the prospect and all associated notes.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="ghost">Cancel</Button>
                <Button variant="destructive">
                  <Trash2 />
                  Delete
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline">Open sheet</Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Prospect details</SheetTitle>
                <SheetDescription>Quick view of the selected prospect.</SheetDescription>
              </SheetHeader>
              <div className="p-4 text-sm">Side panel content goes here.</div>
            </SheetContent>
          </Sheet>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                Actions
                <ChevronDown />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuLabel>Prospect</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Check />
                Mark as replied
              </DropdownMenuItem>
              <DropdownMenuItem>
                <MoreHorizontal />
                Move status
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive">
                <Trash2 />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="secondary"
            onClick={() =>
              toast.success("Outreach message copied", {
                description: "Paste it into the Instagram DM window.",
              })
            }
          >
            Trigger toast
          </Button>
        </div>
      </Section>

      <Section title="Skeleton loaders">
        <div className="space-y-3">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-24 w-full" />
        </div>
      </Section>

      <Section title="Animations">
        <div className="flex flex-wrap gap-4">
          <div className="animate-fade-in rounded-lg border border-border bg-card px-4 py-3 text-sm">
            animate-fade-in
          </div>
          <div className="animate-slide-up rounded-lg border border-border bg-card px-4 py-3 text-sm">
            animate-slide-up
          </div>
          <div className="relative overflow-hidden rounded-lg border border-border bg-muted px-4 py-3 text-sm">
            <span className="relative z-10">animate-shimmer</span>
            <span className="bg-shimmer animate-shimmer absolute inset-0" aria-hidden />
          </div>
        </div>
      </Section>
    </div>
  )
}

function Section({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  )
}
