"use client"

import * as React from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export type ComboboxOption = {
  value: string
  label: string
  hint?: string
}

type ComboboxProps = {
  options: ComboboxOption[]
  value?: string
  onChange: (value: string | undefined) => void
  placeholder?: string
  searchPlaceholder?: string
  className?: string
  disabled?: boolean
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  className,
  disabled,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const inputRef = React.useRef<HTMLInputElement>(null)
  const listRef = React.useRef<HTMLUListElement>(null)
  const [activeIndex, setActiveIndex] = React.useState(-1)

  const filtered = React.useMemo(() => {
    if (!query) return options
    const q = query.toLowerCase()
    return options.filter((o) => o.label.toLowerCase().includes(q))
  }, [options, query])

  const selected = options.find((o) => o.value === value)

  function handleSelect(opt: ComboboxOption) {
    onChange(opt.value === value ? undefined : opt.value)
    setOpen(false)
    setQuery("")
    setActiveIndex(-1)
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation()
    onChange(undefined)
  }

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) {
      setQuery("")
      setActiveIndex(-1)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (activeIndex >= 0 && filtered[activeIndex]) {
        handleSelect(filtered[activeIndex])
      }
    } else if (e.key === "Escape") {
      setOpen(false)
    }
  }

  // scroll active item into view
  React.useEffect(() => {
    if (!listRef.current || activeIndex < 0) return
    const item = listRef.current.children[activeIndex] as HTMLElement | undefined
    item?.scrollIntoView({ block: "nearest" })
  }, [activeIndex])

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "h-9 w-full justify-between px-3 font-normal",
            !selected && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate">{selected ? selected.label : placeholder}</span>
          <span className="ml-1 flex shrink-0 items-center gap-0.5">
            {selected && (
              <span
                role="button"
                tabIndex={0}
                aria-label="Clear selection"
                onClick={handleClear}
                onKeyDown={(e) => e.key === "Enter" && handleClear(e as never)}
                className="rounded p-0.5 hover:bg-muted"
              >
                <X className="size-3 text-muted-foreground" />
              </span>
            )}
            <ChevronsUpDown className="size-3.5 text-muted-foreground" />
          </span>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] p-0"
        onKeyDown={handleKeyDown}
      >
        <div className="border-b border-border px-2 py-1.5">
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActiveIndex(-1) }}
            placeholder={searchPlaceholder}
            className="h-7 border-none shadow-none focus-visible:ring-0 text-sm"
          />
        </div>

        {filtered.length === 0 ? (
          <p className="px-3 py-4 text-center text-sm text-muted-foreground">No results</p>
        ) : (
          <ul
            ref={listRef}
            role="listbox"
            className="max-h-56 overflow-y-auto py-1"
          >
            {filtered.map((opt, i) => (
              <li
                key={opt.value}
                role="option"
                aria-selected={opt.value === value}
                data-active={i === activeIndex}
                onClick={() => handleSelect(opt)}
                className={cn(
                  "flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm",
                  "hover:bg-accent hover:text-accent-foreground",
                  "data-[active=true]:bg-accent data-[active=true]:text-accent-foreground",
                  opt.value === value && "font-medium"
                )}
              >
                <Check
                  className={cn(
                    "size-3.5 shrink-0",
                    opt.value === value ? "opacity-100" : "opacity-0"
                  )}
                />
                <span className="flex-1 truncate">{opt.label}</span>
                {opt.hint && (
                  <span className="shrink-0 text-xs text-muted-foreground">{opt.hint}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  )
}
