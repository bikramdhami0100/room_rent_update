"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import {
  Home, CheckCircle, Clock, AlertTriangle, Search, X,
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
  paymentStatus: "pending" | "paid" | "overdue"
  confirmedAt: string
}

interface BookingsResponse {
  bookings: Booking[]
  total: number
  page: number
  totalPages: number
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
                        variant={isPaid ? "success" : isOverdue ? "destructive" : "warning"}
                      >
                        {isPaid ? t("student.paid") : isOverdue ? t("student.overdue") : `${daysLeft}d left`}
                      </Badge>
                      {isPending && (
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
    </div>
  )
}
