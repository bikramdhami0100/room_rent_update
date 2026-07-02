"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import {
  Home, CheckCircle, Clock, AlertTriangle, Search, X, Eye, Trash2,
  ArrowUpDown, ArrowUp, ArrowDown, Loader2,
} from "lucide-react"
import { formatPrice, getDaysRemaining } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Pagination } from "@/components/ui/pagination"
import { Modal } from "@/components/ui/modal"
import { useT } from "@/hooks/useT"
import { toast } from "react-toastify"

interface Booking {
  _id: string
  roomId: { _id: string; title: string; photos: string[]; monthlyRent: number }
  commission: number
  commissionDeadline: string
  paymentStatus: "pending" | "paid" | "overdue" | "rejected"
  confirmedAt: string
}

interface BookingsResponse {
  bookings: Booking[]
  total: number
  page: number
  totalPages: number
}

interface PaymentInfo {
  _id: string
  confirmationId: string
  method: string
  status: string
  screenshotUrl?: string
}

export default function StudentDashboardPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [sortBy, setSortBy] = useState("confirmedAt")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [page, setPage] = useState(1)

  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [viewBooking, setViewBooking] = useState<Booking | null>(null)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Booking | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [paymentMap, setPaymentMap] = useState<Record<string, PaymentInfo>>({})

  const { t } = useT()

  const fetchBookings = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set("student", "true")
      if (search) params.set("search", search)
      if (statusFilter !== "all") params.set("status", statusFilter)
      params.set("sortBy", sortBy)
      params.set("sortOrder", sortOrder)
      params.set("page", String(page))
      params.set("limit", "10")

      const res = await fetch(`/api/confirm?${params}`)
      if (res.ok) {
        const data: BookingsResponse = await res.json()
        setBookings(data.bookings)
        setTotal(data.total)
        setTotalPages(data.totalPages)

        const pendingBookings = data.bookings.filter(b => b.paymentStatus === "pending")
        if (pendingBookings.length > 0) {
          const ids = pendingBookings.map(b => b._id).join(",")
          const payRes = await fetch(`/api/student/payments?ids=${ids}`)
          if (payRes.ok) {
            const payData = await payRes.json()
            const map: Record<string, PaymentInfo> = {}
            payData.payments.forEach((p: PaymentInfo) => {
              if (!map[p.confirmationId] || p.status === "pending") {
                map[p.confirmationId] = p
              }
            })
            setPaymentMap(map)
          }
        } else {
          setPaymentMap({})
        }
      }
    } catch {
      toast.error("Failed to fetch bookings")
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter, sortBy, sortOrder, page])

  useEffect(() => {
    fetchBookings()
  }, [fetchBookings])

  async function handleCancel() {
    if (!cancelTarget) return
    setCancelling(true)
    try {
      const res = await fetch(`/api/confirm/${cancelTarget._id}`, { method: "DELETE" })
      if (res.ok) {
        toast.success("Booking cancelled")
        setCancelTarget(null)
        fetchBookings()
      } else {
        const err = await res.json()
        toast.error(err.error || "Failed to cancel")
      }
    } catch {
      toast.error("Something went wrong")
    } finally {
      setCancelling(false)
    }
  }

  async function handleDeletePaid() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/confirm/${deleteTarget._id}`, { method: "DELETE" })
      if (res.ok) {
        toast.success("Booking deleted")
        setDeleteTarget(null)
        fetchBookings()
      } else {
        const err = await res.json()
        toast.error(err.error || "Failed to delete")
      }
    } catch {
      toast.error("Something went wrong")
    } finally {
      setDeleting(false)
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

  const paidBookings = bookings.filter((b) => b.paymentStatus === "paid")
  const pendingBookings = bookings.filter((b) => b.paymentStatus === "pending")
  const overdueBookings = bookings.filter((b) => b.paymentStatus === "overdue")

  const stats = [
    { label: "Total Bookings", value: total, icon: Home },
    { label: "Active", value: paidBookings.length, icon: CheckCircle },
    { label: t("student.pending"), value: pendingBookings.length, icon: Clock },
    { label: t("student.overdue"), value: overdueBookings.length, icon: AlertTriangle },
  ]

  const SORT_OPTIONS = [
    { key: "confirmedAt", label: "Confirmed Date" },
    { key: "commission", label: "Commission" },
    { key: "commissionDeadline", label: "Deadline" },
  ]

  return (
    <div className="mx-auto max-w-5xl space-y-6 py-10">
      <div>
        <h1 className="text-3xl font-bold">{t("nav.dashboard")}</h1>
        <p className="text-muted-foreground">{t("common.submit")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon
          return (
            <Card key={s.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{s.label}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{s.value}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("nav.dashboard")}</CardTitle>
          <CardDescription>Your room booking history</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by room title..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="flex h-10 w-full rounded-lg border border-input bg-transparent pl-10 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
              className="h-10 rounded-lg border border-input bg-transparent px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>Sort by:</span>
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => handleSort(opt.key)}
                className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-sm font-medium transition-colors ${
                  sortBy === opt.key
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-secondary"
                }`}
              >
                {opt.label}
                {sortBy === opt.key ? (
                  sortOrder === "asc" ? (
                    <ArrowUp className="h-3.5 w-3.5" />
                  ) : (
                    <ArrowDown className="h-3.5 w-3.5" />
                  )
                ) : (
                  <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
                )}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : bookings.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-8">
              <Home className="h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">{t("student.noRooms")}</p>
              <Link href="/search">
                <Button variant="outline">{t("nav.search")}</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {bookings.map((booking) => {
                const daysLeft = getDaysRemaining(new Date(booking.commissionDeadline))
                const isPending = booking.paymentStatus === "pending"
                const isOverdue = booking.paymentStatus === "overdue"
                const isPaid = booking.paymentStatus === "paid"
                const payment = paymentMap[booking._id]
                const hasPendingDirect = payment?.status === "pending"
                const hasRejectedDirect = payment?.status === "rejected"

                return (
                  <div key={booking._id} className="flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4">
                    <div className="flex items-center gap-4">
                      {booking.roomId?.photos?.[0] && (
                        <img src={booking.roomId.photos[0]} alt="" className="h-16 w-20 rounded-lg object-cover" />
                      )}
                      <div>
                        <p className="font-medium">{booking.roomId?.title || "Unknown Room"}</p>
                        <p className="text-sm text-muted-foreground">
                          Commission: {formatPrice(booking.commission)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Confirmed: {new Date(booking.confirmedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={isPaid ? "success" : isOverdue ? "destructive" : hasRejectedDirect ? "destructive" : hasPendingDirect ? "warning" : "warning"}
                      >
                        {isPaid ? t("student.paid") : isOverdue ? t("student.overdue") : hasPendingDirect ? "Pending" : hasRejectedDirect ? "Rejected" : `${daysLeft}d left`}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setViewBooking(booking)}
                      >
                        <Eye className="h-4 w-4 mr-1" /> View
                      </Button>
                      {isPaid && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive border-destructive/30 hover:bg-destructive/10"
                          onClick={() => setDeleteTarget(booking)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" /> Delete
                        </Button>
                      )}
                      {isPending && !hasPendingDirect && !hasRejectedDirect && (
                        <>
                          <Link href={`/payment/${booking._id}`}>
                            <Button size="sm">{t("student.payCommission")}</Button>
                          </Link>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setCancelTarget(booking)}
                          >
                            <X className="h-4 w-4 text-destructive" />
                          </Button>
                        </>
                      )}
                      {isPending && hasPendingDirect && (
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-xs text-muted-foreground">Awaiting admin verification</span>
                          <Button size="sm" variant="outline" disabled>
                            <Clock className="mr-1 h-3 w-3" /> Pending
                          </Button>
                        </div>
                      )}
                      {isPending && hasRejectedDirect && (
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-xs text-red-500">Payment rejected by admin</span>
                          <Link href={`/payment/${booking._id}`}>
                            <Button size="sm" variant="destructive">
                              Pay Commission Again
                            </Button>
                          </Link>
                        </div>
                      )}
                      {isOverdue && (
                        <Link href="/suspended">
                          <Button size="sm" variant="destructive">{t("suspension.reactivate")}</Button>
                        </Link>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            onPageChange={setPage}
          />
        </CardContent>
      </Card>

      <Modal isOpen={!!cancelTarget} onClose={() => setCancelTarget(null)} title="Cancel Booking">
        <p className="text-sm text-muted-foreground mb-4">
          Are you sure you want to cancel the booking for <strong>{cancelTarget?.roomId?.title}</strong>?
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setCancelTarget(null)}>Keep</Button>
          <Button variant="destructive" onClick={handleCancel} loading={cancelling}>
            Cancel Booking
          </Button>
        </div>
      </Modal>

      <Modal isOpen={!!viewBooking} onClose={() => setViewBooking(null)} title="Booking Details" className="max-w-2xl">
        {viewBooking && (
          <div className="space-y-4">
            {viewBooking.roomId?.photos?.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {viewBooking.roomId.photos.map((photo, idx) => (
                  <img
                    key={idx}
                    src={photo}
                    alt={`${viewBooking.roomId.title} - ${idx + 1}`}
                    className="h-48 w-72 shrink-0 rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => setSelectedImage(photo)}
                  />
                ))}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Room</p>
                <p className="font-medium">{viewBooking.roomId?.title || "Unknown Room"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Monthly Rent</p>
                <p className="font-medium">{formatPrice(viewBooking.roomId?.monthlyRent || 0)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Commission</p>
                <p className="font-medium">{formatPrice(viewBooking.commission)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Payment Status</p>
                <Badge
                  variant={viewBooking.paymentStatus === "paid" ? "success" : viewBooking.paymentStatus === "overdue" ? "destructive" : "warning"}
                >
                  {viewBooking.paymentStatus}
                </Badge>
              </div>
              <div>
                <p className="text-muted-foreground">Confirmed Date</p>
                <p className="font-medium">{new Date(viewBooking.confirmedAt).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Commission Deadline</p>
                <p className="font-medium">{new Date(viewBooking.commissionDeadline).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Days Remaining</p>
                <p className="font-medium">{getDaysRemaining(new Date(viewBooking.commissionDeadline))} days</p>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Booking">
        <p className="text-sm text-muted-foreground mb-4">
          Are you sure you want to delete this paid booking for <strong>{deleteTarget?.roomId?.title}</strong>? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleteTarget(null)}>Keep</Button>
          <Button variant="destructive" onClick={handleDeletePaid} loading={deleting}>
            Delete Booking
          </Button>
        </div>
      </Modal>

      {selectedImage && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80"
          onClick={() => setSelectedImage(null)}
        >
          <button
            className="absolute top-4 right-4 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
            onClick={() => setSelectedImage(null)}
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={selectedImage}
            alt="Room"
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
