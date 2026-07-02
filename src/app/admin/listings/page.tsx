"use client"

import { useEffect, useState, useCallback } from "react"
import {
  MapPin, Loader2, Search, ArrowUpDown, ArrowUp, ArrowDown,
  Trash2, FileSpreadsheet, ChevronLeft, ChevronRight, Plus, X,
} from "lucide-react"
import * as XLSX from "xlsx"
import { formatPrice } from "@/lib/utils"
import { toast } from "react-toastify"
import { useRoleGuard } from "@/hooks/useRoleGuard"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Modal } from "@/components/ui/modal"
import { LocationPicker } from "@/components/ui/location-picker"

interface Listing {
  _id: string
  title: string
  landlordId?: { _id?: string; name?: string; email?: string; phone?: string }
  monthlyRent: number
  location: string
  address?: string
  description?: string
  facilities?: string[]
  roomType?: string
  latitude?: number
  longitude?: number
  whatsappNumber?: string
  createdAt?: string
  isApproved: boolean
  isActive: boolean
}

interface Landlord {
  _id: string
  name: string
  email: string
  phone?: string
}

interface ListingsResponse {
  listings: Listing[]
  total: number
  page: number
  totalPages: number
}

const INITIAL_FORM = {
  landlordId: "",
  title: "",
  description: "",
  monthlyRent: "",
  location: "",
  address: "",
  latitude: "",
  longitude: "",
  whatsappNumber: "",
  roomType: "",
  facilityInput: "",
  facilities: [] as string[],
  isActive: true,
  isApproved: true,
}

export default function AdminListingsPage() {
  useRoleGuard(["admin"])

  const [listings, setListings] = useState<Listing[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Listing | null>(null)
  const [editingListing, setEditingListing] = useState<Listing | null>(null)

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [sortBy, setSortBy] = useState("createdAt")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [page, setPage] = useState(1)

  const [showAddModal, setShowAddModal] = useState(false)
  const [form, setForm] = useState(INITIAL_FORM)
  const [saving, setSaving] = useState(false)
  const [landlords, setLandlords] = useState<Landlord[]>([])
  const [loadingLandlords, setLoadingLandlords] = useState(false)

  const fetchListings = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set("search", search)
      if (statusFilter !== "all") params.set("status", statusFilter)
      params.set("sortBy", sortBy)
      params.set("sortOrder", sortOrder)
      params.set("page", String(page))
      params.set("limit", "20")

      const res = await fetch(`/api/admin/manage/listings?${params}`)
      if (res.ok) {
        const data: ListingsResponse = await res.json()
        setListings(data.listings)
        setTotal(data.total)
        setTotalPages(data.totalPages)
      } else {
        toast.error("Failed to fetch listings")
      }
    } catch {
      toast.error("Something went wrong")
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter, sortBy, sortOrder, page])

  const fetchLandlords = useCallback(async () => {
    setLoadingLandlords(true)
    try {
      const res = await fetch("/api/admin/manage/students?role=landlord&limit=100")
      if (res.ok) {
        const data = await res.json()
        setLandlords(data.users || data)
      }
    } catch {
      // silent
    } finally {
      setLoadingLandlords(false)
    }
  }, [])

  useEffect(() => {
    fetchListings()
  }, [fetchListings])

  async function handleAction(id: string, action: string) {
    setActing(id)
    try {
      const res = await fetch("/api/admin/manage/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId: id, action }),
      })
      if (res.ok) {
        toast.success("Listing updated")
        fetchListings()
      } else {
        const err = await res.json()
        toast.error(err.error || "Failed to update listing")
      }
    } catch {
      toast.error("Something went wrong")
    } finally {
      setActing(null)
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    try {
      const res = await fetch(`/api/admin/manage/listings?id=${id}`, { method: "DELETE" })
      if (res.ok) {
        toast.success("Listing deleted")
        setDeleteTarget(null)
        fetchListings()
      } else {
        const err = await res.json()
        toast.error(err.error || "Failed to delete listing")
      }
    } catch {
      toast.error("Something went wrong")
    } finally {
      setDeleting(null)
    }
  }

  function handleSort(column: string) {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))
    } else {
      setSortBy(column)
      setSortOrder("asc")
    }
    setPage(1)
  }

  function handleExportExcel() {
    const exportData = listings.map((l) => ({
      Title: l.title,
      Landlord: l.landlordId?.name || "Unknown",
      "Landlord Email": l.landlordId?.email || "",
      "Monthly Rent": l.monthlyRent,
      Location: l.location,
      Status: l.isApproved ? "Approved" : "Pending",
      Active: l.isActive ? "Yes" : "No",
      Created: l.createdAt ? new Date(l.createdAt).toLocaleDateString() : "",
    }))

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(exportData)
    XLSX.utils.book_append_sheet(wb, ws, "Listings")
    XLSX.writeFile(wb, `listings-export-${new Date().toISOString().slice(0, 10)}.xlsx`)
    toast.success("Exported as Excel")
  }

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value)
    setPage(1)
  }

  function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setStatusFilter(e.target.value)
    setPage(1)
  }

  function openAddModal() {
    setEditingListing(null)
    setForm(INITIAL_FORM)
    fetchLandlords()
    setShowAddModal(true)
  }

  function openEditModal(listing: Listing) {
    setEditingListing(listing)
    setForm({
      landlordId: listing.landlordId?._id || "",
      title: listing.title,
      description: listing.description || "",
      monthlyRent: String(listing.monthlyRent),
      location: listing.location,
      address: listing.address || "",
      latitude: listing.latitude ? String(listing.latitude) : "",
      longitude: listing.longitude ? String(listing.longitude) : "",
      whatsappNumber: listing.whatsappNumber || "",
      roomType: listing.roomType || "",
      facilityInput: "",
      facilities: listing.facilities || [],
      isActive: listing.isActive,
      isApproved: listing.isApproved,
    })
    fetchLandlords()
    setShowAddModal(true)
  }

  function addFacility() {
    const trimmed = form.facilityInput.trim()
    if (trimmed && !form.facilities.includes(trimmed)) {
      setForm({ ...form, facilities: [...form.facilities, trimmed], facilityInput: "" })
    }
  }

  function removeFacility(f: string) {
    setForm({ ...form, facilities: form.facilities.filter((x) => x !== f) })
  }

  async function handleSaveRoom() {
    if (!form.title || !form.monthlyRent || !form.location || !form.address) {
      toast.error("Title, Rent, Location, and Address are required")
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/admin/manage/listings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          landlordId: form.landlordId || undefined,
          title: form.title,
          description: form.description,
          monthlyRent: Number(form.monthlyRent),
          location: form.location,
          address: form.address,
          latitude: form.latitude ? Number(form.latitude) : undefined,
          longitude: form.longitude ? Number(form.longitude) : undefined,
          whatsappNumber: form.whatsappNumber || undefined,
          facilities: form.facilities,
          roomType: form.roomType,
          isActive: form.isActive,
          isApproved: form.isApproved,
        }),
      })
      if (res.ok) {
        toast.success("Room created successfully")
        setShowAddModal(false)
        setPage(1)
        fetchListings()
      } else {
        const err = await res.json()
        toast.error(err.error || "Failed to create room")
      }
    } catch {
      toast.error("Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  function SortIcon({ column }: { column: string }) {
    if (sortBy !== column) return <ArrowUpDown className="ml-1 h-3 w-3 inline opacity-40" />
    return sortOrder === "asc"
      ? <ArrowUp className="ml-1 h-3 w-3 inline" />
      : <ArrowDown className="ml-1 h-3 w-3 inline" />
  }

  function Pagination() {
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
      <div className="flex items-center justify-between gap-4 pt-4">
        <p className="text-sm text-muted-foreground">
          {total} result{total !== 1 ? "s" : ""}
        </p>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
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
                onClick={() => setPage(p)}
              >
                {p}
              </Button>
            )
          )}
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 py-10">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Manage Listings</h1>
          <p className="text-muted-foreground">Approve, reject, and manage room listings</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={openAddModal}>
            <Plus className="mr-2 h-4 w-4" />
            Add Room
          </Button>
          <Button variant="outline" onClick={handleExportExcel} disabled={listings.length === 0}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Export Excel
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by title, location, address..."
            value={search}
            onChange={handleSearchChange}
            className="flex h-10 w-full rounded-lg border border-input bg-transparent pl-10 pr-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
        <select
          value={statusFilter}
          onChange={handleStatusChange}
          className="h-10 rounded-lg border border-input bg-transparent px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="all">All Status</option>
          <option value="approved">Approved</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : listings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16">
            <MapPin className="h-12 w-12 text-muted-foreground" />
            <p className="text-lg text-muted-foreground">No listings found</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-secondary">
                <tr>
                  <th
                    className="cursor-pointer select-none px-4 py-3 text-left font-medium"
                    onClick={() => handleSort("title")}
                  >
                    Title <SortIcon column="title" />
                  </th>
                  <th className="px-4 py-3 text-left font-medium">Landlord</th>
                  <th
                    className="cursor-pointer select-none px-4 py-3 text-left font-medium"
                    onClick={() => handleSort("monthlyRent")}
                  >
                    Rent <SortIcon column="monthlyRent" />
                  </th>
                  <th
                    className="cursor-pointer select-none px-4 py-3 text-left font-medium"
                    onClick={() => handleSort("location")}
                  >
                    Location <SortIcon column="location" />
                  </th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {listings.map((l) => (
                  <tr key={l._id} className="hover:bg-secondary/50">
                    <td className="px-4 py-3 font-medium">{l.title}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {l.landlordId?.name || "Unknown"}
                    </td>
                    <td className="px-4 py-3">{formatPrice(l.monthlyRent)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{l.location}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Badge variant={l.isApproved ? "success" : "warning"}>
                          {l.isApproved ? "Approved" : "Pending"}
                        </Badge>
                        <Badge variant={l.isActive ? "default" : "secondary"}>
                          {l.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {!l.isApproved && (
                          <Button size="sm" onClick={() => handleAction(l._id, "approve")} loading={acting === l._id}>
                            Approve
                          </Button>
                        )}
                        {l.isApproved && (
                          <Button size="sm" variant="destructive" onClick={() => handleAction(l._id, "reject")} loading={acting === l._id}>
                            Reject
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAction(l._id, l.isActive ? "deactivate" : "activate")}
                          loading={acting === l._id}
                        >
                          {l.isActive ? "Deactivate" : "Activate"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditModal(l)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleteTarget(l)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination />
        </>
      )}

      {/* Add/Edit Room Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title={editingListing ? "Edit Room" : "Add New Room"} className="max-w-2xl">
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Input
                label="Title *"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Cozy 1-bedroom apartment"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-medium block mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Describe the room..."
                rows={3}
                className="flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <Input
              label="Monthly Rent (NPR) *"
              type="number"
              value={form.monthlyRent}
              onChange={(e) => setForm({ ...form, monthlyRent: e.target.value })}
              placeholder="e.g. 15000"
            />
            <Input
              label="Room Type"
              value={form.roomType}
              onChange={(e) => setForm({ ...form, roomType: e.target.value })}
              placeholder="e.g. Single, Double, Flat"
            />
            <Input
              label="Location *"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="e.g. Kathmandu, Nepal"
            />
            <Input
              label="Address *"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Full street address"
            />
            <Input
              label="Latitude"
              type="number"
              step="any"
              value={form.latitude}
              onChange={(e) => setForm({ ...form, latitude: e.target.value })}
              placeholder="27.7172"
            />
            <Input
              label="Longitude"
              type="number"
              step="any"
              value={form.longitude}
              onChange={(e) => setForm({ ...form, longitude: e.target.value })}
              placeholder="85.3240"
            />
            <Input
              label="WhatsApp Number"
              value={form.whatsappNumber}
              onChange={(e) => setForm({ ...form, whatsappNumber: e.target.value })}
              placeholder="e.g. 9800000000"
            />
          </div>

          <LocationPicker
            latitude={form.latitude ? Number(form.latitude) : null}
            longitude={form.longitude ? Number(form.longitude) : null}
            onLocationChange={(lat, lng) => setForm({ ...form, latitude: String(lat), longitude: String(lng) })}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium block mb-1">Landlord</label>
              <select
                value={form.landlordId}
                onChange={(e) => setForm({ ...form, landlordId: e.target.value })}
                className="flex h-10 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Self (Admin)</option>
                {loadingLandlords ? (
                  <option disabled>Loading...</option>
                ) : (
                  landlords.map((l) => (
                    <option key={l._id} value={l._id}>{l.name} ({l.email})</option>
                  ))
                )}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium block mb-1">Facilities</label>
            <div className="flex gap-2">
              <Input
                value={form.facilityInput}
                onChange={(e) => setForm({ ...form, facilityInput: e.target.value })}
                placeholder="Type a facility and press Add"
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addFacility() } }}
              />
              <Button variant="outline" onClick={addFacility} type="button">Add</Button>
            </div>
            {form.facilities.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {form.facilities.map((f) => (
                  <span key={f} className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-xs font-medium">
                    {f}
                    <button onClick={() => removeFacility(f)} className="hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="rounded border-input"
              />
              Active
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isApproved}
                onChange={(e) => setForm({ ...form, isApproved: e.target.checked })}
                className="rounded border-input"
              />
              Approved
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button onClick={handleSaveRoom} loading={saving}>
              {editingListing ? "Update Room" : "Create Room"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Listing">
        <p className="text-sm text-muted-foreground mb-4">
          Are you sure you want to delete <strong>{deleteTarget?.title}</strong>? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button
            variant="destructive"
            onClick={() => deleteTarget && handleDelete(deleteTarget._id)}
            loading={deleting === deleteTarget?._id}
          >
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  )
}
