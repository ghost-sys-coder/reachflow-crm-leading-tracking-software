"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Pencil, Plus, Trash2, UserMinus } from "lucide-react"
import { toast } from "sonner"

import {
  addProspectsToCampaign,
  deleteCampaign,
  removeProspectFromCampaign,
} from "@/app/actions/campaigns"
import { CampaignDialog } from "@/components/campaigns/campaign-dialog"
import { AddProspectDialog } from "@/components/crm/add-prospect-dialog"
import { StatusBadge } from "@/components/crm/status-badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
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
import type {
  CampaignWithProspects,
  Prospect,
  TeamMember,
} from "@/types/database"
import type { CampaignOption } from "@/components/campaigns/campaign-picker"

export function CampaignDetailManager({
  campaign,
  allProspects,
  teamMembers,
  campaignOptions,
  industryOptions,
  customPlatforms,
  canWrite,
  isAdmin,
}: {
  campaign: CampaignWithProspects
  allProspects: Prospect[]
  teamMembers: TeamMember[]
  campaignOptions: CampaignOption[]
  industryOptions: string[]
  customPlatforms: string[]
  canWrite: boolean
  isAdmin: boolean
}) {
  const router = useRouter()
  const [attachOpen, setAttachOpen] = React.useState(false)
  const [selected, setSelected] = React.useState<string[]>([])
  const [pending, startTransition] = React.useTransition()
  const attachedIds = new Set(campaign.prospects.map((prospect) => prospect.id))
  const available = allProspects.filter((prospect) => !attachedIds.has(prospect.id))

  function attach() {
    startTransition(async () => {
      const result = await addProspectsToCampaign(campaign.id, selected)
      if (result.error) {
        toast.error(result.error)
        return
      }
      const count = result.data?.count ?? selected.length
      toast.success(`${count} prospect${count === 1 ? "" : "s"} added`)
      setSelected([])
      setAttachOpen(false)
      router.refresh()
    })
  }

  function remove(prospectId: string) {
    startTransition(async () => {
      const result = await removeProspectFromCampaign(campaign.id, prospectId)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success("Prospect removed from campaign")
      router.refresh()
    })
  }

  function removeCampaign() {
    startTransition(async () => {
      const result = await deleteCampaign(campaign.id)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success("Campaign deleted")
      router.push("/campaigns")
    })
  }

  return (
    <div className="space-y-5">
      {canWrite && (
        <div className="flex flex-wrap gap-2">
          <CampaignDialog
            campaign={campaign}
            teamMembers={teamMembers}
            trigger={<Button variant="outline" size="sm"><Pencil />Edit campaign</Button>}
          />
          <Dialog open={attachOpen} onOpenChange={setAttachOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm"><Plus />Attach existing</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Attach existing prospects</DialogTitle>
                <DialogDescription>
                  Select prospects to add. Existing campaign memberships are preserved.
                </DialogDescription>
              </DialogHeader>
              <div className="max-h-80 space-y-1 overflow-y-auto">
                {available.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    Every prospect is already attached to this campaign.
                  </p>
                ) : available.map((prospect) => {
                  const checked = selected.includes(prospect.id)
                  return (
                    <label key={prospect.id} className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 hover:bg-muted">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => setSelected(
                          checked
                            ? selected.filter((id) => id !== prospect.id)
                            : [...selected, prospect.id],
                        )}
                        className="size-4 accent-primary"
                      />
                      <span className="min-w-0 flex-1 truncate text-sm">{prospect.business_name}</span>
                      <span className="text-xs capitalize text-muted-foreground">{prospect.status}</span>
                    </label>
                  )
                })}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAttachOpen(false)}>Cancel</Button>
                <Button disabled={pending || selected.length === 0} onClick={attach}>
                  Add {selected.length || ""} prospect{selected.length === 1 ? "" : "s"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <AddProspectDialog
            triggerLabel="Create prospect"
            variant="outline"
            campaignOptions={campaignOptions}
            initialCampaignIds={[campaign.id]}
            industryOptions={industryOptions}
            customPlatforms={customPlatforms}
          />
          {isAdmin && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm"><Trash2 />Delete</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete {campaign.name}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This removes the campaign and its memberships. Prospects will not be deleted.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={removeCampaign}>Delete campaign</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border">
        <div className="grid grid-cols-[minmax(0,1fr)_120px_120px_44px] gap-3 border-b bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground">
          <span>Prospect</span><span>Platform</span><span>Status</span><span />
        </div>
        {campaign.prospects.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            No prospects are attached to this campaign yet.
          </p>
        ) : (
          campaign.prospects.map((prospect) => (
            <div key={prospect.id} className="grid grid-cols-[minmax(0,1fr)_120px_120px_44px] items-center gap-3 border-b px-4 py-3 last:border-b-0">
              <button type="button" onClick={() => router.push(`/prospects/${prospect.id}`)} className="truncate text-left text-sm font-medium hover:underline">
                {prospect.business_name}
              </button>
              <span className="truncate text-sm capitalize text-muted-foreground">{prospect.platform}</span>
              <StatusBadge status={prospect.status as Parameters<typeof StatusBadge>[0]["status"]} />
              {canWrite ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={pending}
                  onClick={() => remove(prospect.id)}
                  aria-label={`Remove ${prospect.business_name}`}
                >
                  <UserMinus />
                </Button>
              ) : <span />}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
