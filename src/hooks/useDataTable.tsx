"use client"

import { useState, useCallback, useMemo } from "react"
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"

export interface SortConfig {
  key: string
  order: "asc" | "desc"
}

export interface DataTableState {
  search: string
  filters: Record<string, string>
  sort: SortConfig
  page: number
  limit: number
}

export function useDataTable(initialLimit = 20) {
  const [search, setSearch] = useState("")
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [sort, setSort] = useState<SortConfig>({ key: "createdAt", order: "desc" })
  const [page, setPage] = useState(1)
  const [limit] = useState(initialLimit)

  const queryString = useMemo(() => {
    const params = new URLSearchParams()
    if (search) params.set("search", search)
    for (const [key, val] of Object.entries(filters)) {
      if (val && val !== "all") params.set(key, val)
    }
    params.set("sortBy", sort.key)
    params.set("sortOrder", sort.order)
    params.set("page", String(page))
    params.set("limit", String(limit))
    return params.toString()
  }, [search, filters, sort, page, limit])

  const handleSearch = useCallback((value: string) => {
    setSearch(value)
    setPage(1)
  }, [])

  const handleFilter = useCallback((key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
    setPage(1)
  }, [])

  const handleSort = useCallback((key: string) => {
    setSort((prev) => ({
      key,
      order: prev.key === key && prev.order === "asc" ? "desc" : "asc",
    }))
    setPage(1)
  }, [])

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage)
  }, [])

  const resetFilters = useCallback(() => {
    setSearch("")
    setFilters({})
    setSort({ key: "createdAt", order: "desc" })
    setPage(1)
  }, [])

  return {
    search,
    filters,
    sort,
    page,
    limit,
    queryString,
    handleSearch,
    handleFilter,
    handleSort,
    handlePageChange,
    resetFilters,
  }
}

export function SortIcon({ sort, column }: { sort: SortConfig; column: string }) {
  if (sort.key !== column) {
    return <ArrowUpDown className="ml-1 h-3 w-3 inline opacity-40" />
  }
  return sort.order === "asc"
    ? <ArrowUp className="ml-1 h-3 w-3 inline" />
    : <ArrowDown className="ml-1 h-3 w-3 inline" />
}
