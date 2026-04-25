"use client"

import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"

export function ClearFiltersLink() {
  const router = useRouter()
  return (
    <Button variant="outline" size="sm" onClick={() => router.push("?")}>
      Clear filters
    </Button>
  )
}
