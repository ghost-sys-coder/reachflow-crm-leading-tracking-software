"use client"

import { Check, ChevronsUpDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export type CampaignOption = {
  id: string
  name: string
  status: string
}

export function CampaignPicker({
  options,
  value,
  onChange,
}: {
  options: CampaignOption[]
  value: string[]
  onChange: (value: string[]) => void
}) {
  const selected = new Set(value)
  const label =
    value.length === 0
      ? "No campaign"
      : value.length === 1
        ? options.find((option) => option.id === value[0])?.name ?? "1 campaign"
        : `${value.length} campaigns`

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className="w-full justify-between font-normal">
          <span className={cn("truncate", value.length === 0 && "text-muted-foreground")}>
            {label}
          </span>
          <ChevronsUpDown className="size-3.5 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-1.5">
        {options.length === 0 ? (
          <p className="px-2 py-3 text-center text-xs text-muted-foreground">
            No campaigns available. Create one from Campaigns.
          </p>
        ) : (
          <div className="max-h-56 overflow-y-auto">
            {options.map((option) => {
              const active = selected.has(option.id)
              return (
                <button
                  key={option.id}
                  type="button"
                  className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted"
                  onClick={() =>
                    onChange(
                      active
                        ? value.filter((id) => id !== option.id)
                        : [...value, option.id],
                    )
                  }
                >
                  <span className={cn(
                    "flex size-4 items-center justify-center rounded border",
                    active ? "border-primary bg-primary text-primary-foreground" : "border-input",
                  )}>
                    {active && <Check className="size-3" />}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{option.name}</span>
                  <span className="text-[11px] capitalize text-muted-foreground">
                    {option.status}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
