"use client"

import * as React from "react"
import { Plus } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { createCampaign, updateCampaign } from "@/app/actions/campaigns"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { CAMPAIGN_STATUSES, type CampaignInput } from "@/lib/validation/schemas"
import type { Campaign, TeamMember } from "@/types/database"

const STATUS_LABELS: Record<(typeof CAMPAIGN_STATUSES)[number], string> = {
  draft: "Draft",
  active: "Active",
  paused: "Paused",
  completed: "Completed",
  archived: "Archived",
}

function dateInput(value: Date | string | null | undefined) {
  if (!value) return ""
  return new Date(value).toISOString().slice(0, 10)
}

export function CampaignDialog({
  campaign,
  teamMembers,
  trigger,
}: {
  campaign?: Campaign
  teamMembers: TeamMember[]
  trigger?: React.ReactNode
}) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [pending, startTransition] = React.useTransition()
  const [name, setName] = React.useState(campaign?.name ?? "")
  const [description, setDescription] = React.useState(campaign?.description ?? "")
  const [status, setStatus] = React.useState<CampaignInput["status"]>(
    (campaign?.status as CampaignInput["status"]) ?? "draft",
  )
  const [channel, setChannel] = React.useState(campaign?.channel ?? "")
  const [goal, setGoal] = React.useState(campaign?.goal ?? "")
  const [budget, setBudget] = React.useState(
    campaign?.budget_cents != null ? (campaign.budget_cents / 100).toString() : "",
  )
  const [currency, setCurrency] = React.useState(campaign?.currency ?? "USD")
  const [ownerId, setOwnerId] = React.useState(campaign?.owner_id ?? "unassigned")
  const [startAt, setStartAt] = React.useState(dateInput(campaign?.start_at))
  const [endAt, setEndAt] = React.useState(dateInput(campaign?.end_at))

  function submit() {
    const parsedBudget = budget.trim() === "" ? null : Number(budget)
    if (parsedBudget != null && (!Number.isFinite(parsedBudget) || parsedBudget < 0)) {
      toast.error("Budget must be a positive number")
      return
    }

    const payload: CampaignInput = {
      name,
      description: description || undefined,
      status,
      channel: channel || undefined,
      goal: goal || undefined,
      budget_cents: parsedBudget == null ? null : Math.round(parsedBudget * 100),
      currency: currency.toUpperCase(),
      owner_id: ownerId === "unassigned" ? null : ownerId,
      start_at: startAt ? new Date(`${startAt}T00:00:00`) : null,
      end_at: endAt ? new Date(`${endAt}T23:59:59`) : null,
    }

    startTransition(async () => {
      const result = campaign
        ? await updateCampaign(campaign.id, payload)
        : await createCampaign(payload)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success(campaign ? "Campaign updated" : "Campaign created")
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <Plus />
            New campaign
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{campaign ? "Edit campaign" : "Create campaign"}</DialogTitle>
          <DialogDescription>
            Define the initiative, ownership, timing, and commercial target.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="campaign-name">Name</Label>
            <Input id="campaign-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="campaign-description">Description</Label>
            <Textarea id="campaign-description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(value) => setStatus(value as CampaignInput["status"])}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CAMPAIGN_STATUSES.map((item) => (
                    <SelectItem key={item} value={item}>{STATUS_LABELS[item]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="campaign-channel">Primary channel</Label>
              <Input id="campaign-channel" placeholder="e.g. Meta Ads, LinkedIn" value={channel} onChange={(e) => setChannel(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="campaign-goal">Goal</Label>
            <Input id="campaign-goal" placeholder="e.g. Book 20 discovery calls" value={goal} onChange={(e) => setGoal(e.target.value)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-[1fr_100px]">
            <div className="grid gap-2">
              <Label htmlFor="campaign-budget">Budget</Label>
              <Input id="campaign-budget" type="number" min="0" step="0.01" placeholder="0.00" value={budget} onChange={(e) => setBudget(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="campaign-currency">Currency</Label>
              <Input id="campaign-currency" maxLength={3} value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Owner</Label>
            <Select value={ownerId} onValueChange={setOwnerId}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {teamMembers.map((member) => (
                  <SelectItem key={member.user_id} value={member.user_id}>
                    {member.full_name ?? member.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="campaign-start">Start date</Label>
              <Input id="campaign-start" type="date" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="campaign-end">End date</Label>
              <Input id="campaign-end" type="date" value={endAt} onChange={(e) => setEndAt(e.target.value)} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>Cancel</Button>
          <Button onClick={submit} disabled={pending || !name.trim()}>
            {pending ? "Saving..." : campaign ? "Save changes" : "Create campaign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
