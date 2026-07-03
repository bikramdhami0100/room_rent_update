"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface PaginationProps {
  page: number
  totalPages: number
  total: number
  onPageChange: (page: number) => void
}

export function Pagination({ page, totalPages, total, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null

  function getPageNumbers() {
    const pages: (number | "...")[] = []
    const delta = 2
    const left = Math.max(2, page - delta)
    const right = Math.min(totalPages - 1, page + delta)

    pages.push(1)
    if (left > 2) pages.push("...")
    for (let i = left; i <= right; i++) pages.push(i)
    if (right < totalPages - 1) pages.push("...")
    if (totalPages > 1) pages.push(totalPages)

    return pages
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 pt-4">
      <p className="text-sm text-muted-foreground">
        {total} result{total !== 1 ? "s" : ""}
      </p>
      <div className="flex items-center gap-1 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {getPageNumbers().map((p, i) =>
          p === "..." ? (
            <span key={`ellipsis-${i}`} className="px-2 text-muted-foreground text-sm">...</span>
          ) : (
            <Button
              key={p}
              variant={p === page ? "default" : "outline"}
              size="sm"
              className="min-w-[2.25rem]"
              onClick={() => onPageChange(p)}
            >
              {p}
            </Button>
          )
        )}
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
