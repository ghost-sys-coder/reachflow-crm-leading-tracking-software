import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

function pageHref(pathname: string, params: Record<string, string | undefined>, page: number) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value && key !== "page") query.set(key, value)
  }
  if (page > 1) query.set("page", String(page))
  const value = query.toString()
  return value ? `${pathname}?${value}` : pathname
}

export function ProspectPagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  params,
  pathname = "/prospects",
}: {
  currentPage: number
  totalPages: number
  totalItems: number
  pageSize: number
  params: Record<string, string | undefined>
  pathname?: string
}) {
  if (totalItems === 0) return null
  const start = (currentPage - 1) * pageSize + 1
  const end = Math.min(currentPage * pageSize, totalItems)
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1).filter(
    (page) => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1,
  )

  return (
    <nav className="flex flex-col gap-3 rounded-xl border bg-card px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between" aria-label="Prospect pages">
      <p className="text-xs text-muted-foreground">
        Showing <span className="font-medium text-foreground">{start}–{end}</span> of{" "}
        <span className="font-medium text-foreground">{totalItems}</span> prospects
      </p>
      <div className="flex items-center gap-1">
        {currentPage === 1 ? (
          <Button variant="outline" size="sm" className="h-8 px-2.5" disabled><ChevronLeft className="size-4" />Previous</Button>
        ) : (
          <Button asChild variant="outline" size="sm" className="h-8 px-2.5">
            <Link href={pageHref(pathname, params, currentPage - 1)}><ChevronLeft className="size-4" />Previous</Link>
          </Button>
        )}
        <div className="hidden items-center gap-1 sm:flex">
          {pages.map((page, index) => {
            const previous = pages[index - 1]
            return (
              <span key={page} className="contents">
                {previous && page - previous > 1 && <span className="px-1 text-xs text-muted-foreground">…</span>}
                <Button asChild variant={page === currentPage ? "default" : "ghost"} size="icon-sm" className={cn("size-8", page === currentPage && "shadow-sm")}>
                  <Link href={pageHref(pathname, params, page)} aria-current={page === currentPage ? "page" : undefined}>{page}</Link>
                </Button>
              </span>
            )
          })}
        </div>
        {currentPage === totalPages ? (
          <Button variant="outline" size="sm" className="h-8 px-2.5" disabled>Next<ChevronRight className="size-4" /></Button>
        ) : (
          <Button asChild variant="outline" size="sm" className="h-8 px-2.5">
            <Link href={pageHref(pathname, params, currentPage + 1)}>Next<ChevronRight className="size-4" /></Link>
          </Button>
        )}
      </div>
    </nav>
  )
}
