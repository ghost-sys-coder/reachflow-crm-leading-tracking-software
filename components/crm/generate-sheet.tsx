"use client"

import * as React from "react"
import { Loader2, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { GeneratorPanel } from "@/components/crm/generator-panel"
import { getProspectById } from "@/app/actions/prospects"
import type { Message, ProspectWithTags } from "@/types/database"

export function GenerateSheet({
  prospect,
  agencyReady,
}: {
  prospect: ProspectWithTags
  agencyReady: boolean
}) {
  const [open, setOpen] = React.useState(false)
  const [messages, setMessages] = React.useState<Message[]>([])
  const [loading, setLoading] = React.useState(false)

  async function handleOpen(next: boolean) {
    setOpen(next)
    if (next) {
      setLoading(true)
      const result = await getProspectById(prospect.id)
      if (result.data) {
        const sorted = [...result.data.messages].sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        )
        setMessages(sorted)
      }
      setLoading(false)
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="xs"
        onClick={(e) => {
          e.stopPropagation()
          handleOpen(true)
        }}
      >
        <Sparkles />
        Generate
      </Button>

      <Sheet open={open} onOpenChange={handleOpen}>
        <SheetContent className="flex flex-col sm:max-w-lg">
          <SheetHeader className="border-b border-border pb-3">
            <SheetTitle className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              {prospect.business_name}
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
                <Loader2 className="mr-2 size-4 animate-spin" />
                Loading messages...
              </div>
            ) : (
              <GeneratorPanel
                prospectId={prospect.id}
                messages={messages}
                agencyReady={agencyReady}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
