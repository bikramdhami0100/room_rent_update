"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { Search, Users, Loader2, X, Eye, Check, ThumbsDown, ChevronLeft, ChevronRight } from "lucide-react"
import { formatPrice } from "@/lib/utils"
import { NepaliDateDisplay } from "@/components/ui/nepali-calendar"
import { adToBs, getNepaliMonthName } from "@/lib/nepali-calendar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Modal } from "@/components/ui/modal"
import { toast } from "react-toastify"

interface RoomInfo { _id: string; title: string; photos: string[]; monthlyRent: number }
interface StudentInfo { _id: string; name: string; email: string }
interface Contract { _id: string; studentId: StudentInfo; roomId: RoomInfo; startDate: string; monthlyRent: number; status: string; perDayRate: number }
interface RentPay { _id: string; contractId: string; amount: number; month: number; year: number; status: string; paidAt: string; method: string; screenshotUrl?: string; notes?: string; studentId?: string }

export default function LandlordRentalsPage() {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [payments, setPayments] = useState<RentPay[]>([])
  const [loading, setLoading] = useState(true)
  const [terminateTarget, setTerminateTarget] = useState<Contract | null>(null)
  const [terminating, setTerminating] = useState(false)
  const [reviewPayment, setReviewPayment] = useState<RentPay | null>(null)
  const [reviewing, setReviewing] = useState(false)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [page, setPage] = useState(1)
  const perPage = 8

  const activeContracts = contracts.filter(c => c.status === "active")
  const totalCollected = payments.reduce((s, p) => s + p.amount, 0)

  const filteredContracts = useMemo(() => {
    let list = contracts
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(c =>
        c.roomId?.title?.toLowerCase().includes(q) ||
        c.studentId?.name?.toLowerCase().includes(q) ||
        c.studentId?.email?.toLowerCase().includes(q)
      )
    }
    if (statusFilter !== "all") {
      list = list.filter(c => c.status === statusFilter)
    }
    return list
  }, [contracts, search, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredContracts.length / perPage))
  const paginatedContracts = filteredContracts.slice((page - 1) * perPage, page * perPage)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [cr, pr] = await Promise.all([
        fetch("/api/rental/contract?limit=100"),
        fetch("/api/landlord/rental-payments"),
      ])
      if (cr.ok) setContracts((await cr.json()).contracts || [])
      if (pr.ok) setPayments((await pr.json()).payments || [])
    } catch { toast.error("Failed to load data") } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleReview(status: "approved" | "rejected", paymentId?: string) {
    const id = paymentId || reviewPayment?._id
    if (!id) return
    setReviewing(true)
    try {
      const res = await fetch(`/api/rental/payment/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      if (res.ok) { toast.success(`Payment ${status}`); setReviewPayment(null); fetchData() }
      else { const e = await res.json(); toast.error(e.error || "Failed") }
    } catch { toast.error("Something went wrong") } finally { setReviewing(false) }
  }

  async function handleTerminate() {
    if (!terminateTarget) return
    setTerminating(true)
    try {
      const res = await fetch(`/api/rental/contract/${terminateTarget._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "terminated" }),
      })
      if (res.ok) { toast.success("Contract terminated"); setTerminateTarget(null); fetchData() }
      else { const e = await res.json(); toast.error(e.error || "Failed") }
    } catch { toast.error("Something went wrong") } finally { setTerminating(false) }
  }

  function getPay(cId: string, y: number, m: number) {
    return payments.find(p => p.contractId === cId && p.year === y && p.month === m)
  }

  function getMonths(startDate: string) {
    if (!startDate) return []
    const s = new Date(startDate)
    if (isNaN(s.getTime())) return []
    const bsStart = adToBs(s.getFullYear(), s.getMonth() + 1, s.getDate())
    const now = adToBs(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate())
    if (!bsStart || !now) return []
    const months: { year: number; month: number }[] = []
    let y = bsStart.year, m = bsStart.month
    let maxIter = 1200
    while ((y < now.year || (y === now.year && m <= now.month)) && maxIter > 0) {
      months.push({ year: y, month: m })
      m++; if (m > 12) { m = 1; y++ }
      maxIter--
    }
    return months
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 py-10">
      <div>
        <h1 className="text-3xl font-bold">Rental Management</h1>
        <p className="text-muted-foreground">Track student rent payments month by month</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Search tenant or room..." className="h-10 w-full rounded-lg border border-input bg-transparent pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }} className="h-10 rounded-lg border border-input bg-transparent px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="terminated">Terminated</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Active Tenants</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{activeContracts.length}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Collected</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-green-600">{formatPrice(totalCollected)}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Contracts</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{contracts.length}</p></CardContent></Card>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : filteredContracts.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center gap-4 py-12">
          <Users className="h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">No contracts match your search</p>
        </CardContent></Card>
      ) : paginatedContracts.map(contract => {
        const months = getMonths(contract.startDate || "")
        const isActive = contract.status === "active"
        return (
          <Card key={contract._id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{contract.roomId?.title || "Unknown"}</CardTitle>
                  <CardDescription>
                    Tenant: <strong>{contract.studentId?.name || "Unknown"}</strong>
                    {contract.studentId?.email && <span className="ml-2 text-xs">({contract.studentId.email})</span>}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={isActive ? "success" : "secondary"}>{contract.status}</Badge>
                  {isActive && (
                    <Button size="sm" variant="destructive" onClick={() => setTerminateTarget(contract)}>
                      <X className="mr-1 h-3 w-3" /> End
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-3 flex gap-4 text-sm">
                <span className="text-muted-foreground">Rent: <strong>{formatPrice(contract.monthlyRent)}/mo</strong></span>
                <span className="text-muted-foreground">Started: {contract.startDate ? <NepaliDateDisplay date={new Date(contract.startDate)} /> : <span className="text-red-500">N/A</span>}</span>
                {isActive && <span className="text-muted-foreground">Per day: <strong>{formatPrice(contract.perDayRate)}</strong></span>}
              </div>
              {months.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b text-left">
                      <th className="pb-2 font-medium">Month (BS)</th>
                      <th className="pb-2 font-medium">Amount</th>
                      <th className="pb-2 font-medium">Status</th>
                      <th className="pb-2 font-medium">Paid Date</th>
                      <th className="pb-2 font-medium">Method</th>
                      <th className="pb-2 font-medium">Action</th>
                    </tr></thead>
                    <tbody>
                      {months.map(({ year, month }) => {
                        const pay = getPay(contract._id, year, month)
                        return (
                          <tr key={`${year}-${month}`} className={`border-b last:border-0 ${pay?.status === "approved" || pay?.status === "paid" ? "bg-green-50 dark:bg-green-950/20" : pay?.status === "rejected" ? "bg-red-50 dark:bg-red-950/20" : pay?.status === "pending" ? "bg-yellow-50 dark:bg-yellow-950/20" : "hover:bg-secondary/50"}`}>
                            <td className="py-2.5 font-medium">{getNepaliMonthName(month)} {year}</td>
                            <td className="py-2.5">{formatPrice(contract.monthlyRent)}</td>
                            <td className="py-2.5">
                              {!pay ? (
                                <Badge variant="destructive">Unpaid</Badge>
                              ) : pay.status === "pending" ? (
                                <Badge variant="warning">Pending</Badge>
                              ) : pay.status === "approved" || pay.status === "paid" ? (
                                <Badge variant="success">Approved</Badge>
                              ) : pay.status === "rejected" ? (
                                <Badge variant="destructive">Rejected</Badge>
                              ) : (
                                <Badge variant="secondary">{pay.status}</Badge>
                              )}
                            </td>
                            <td className="py-2.5 text-muted-foreground">{pay?.paidAt ? new Date(pay.paidAt).toLocaleDateString() : "-"}</td>
                            <td className="py-2.5 text-muted-foreground">{pay?.method || "-"}</td>
                            <td className="py-2.5">
                              {pay && (
                                <div className="flex items-center gap-1">
                                  {pay.status === "pending" && (
                                    <>
                                      <Button size="sm" variant="ghost" className="text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => handleReview("approved", pay._id)} title="Approve">
                                        <Check className="h-4 w-4" />
                                      </Button>
                                      <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleReview("rejected", pay._id)} title="Reject">
                                        <ThumbsDown className="h-4 w-4" />
                                      </Button>
                                    </>
                                  )}
                                  <Button size="sm" variant="ghost" onClick={() => setReviewPayment(pay)} title="View Details">
                                    <Eye className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      <Modal isOpen={!!reviewPayment} onClose={() => setReviewPayment(null)} title="Review Payment">
        {reviewPayment && (
          <div className="space-y-5 py-4">
            <div className="space-y-3 rounded-lg bg-muted/50 p-4 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Month</span><span className="font-medium">{getNepaliMonthName(reviewPayment.month)} {reviewPayment.year}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><span className="font-bold text-lg text-primary">{formatPrice(reviewPayment.amount)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Method</span><span className="font-medium capitalize">{reviewPayment.method}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Status</span>
                <Badge variant={reviewPayment.status === "pending" ? "warning" : reviewPayment.status === "approved" || reviewPayment.status === "paid" ? "success" : "destructive"}>
                  {reviewPayment.status}
                </Badge>
              </div>

            </div>

            {reviewPayment.screenshotUrl && (
              <div>
                <p className="mb-2 text-sm font-medium text-muted-foreground">Payment Screenshot</p>
                <a href={reviewPayment.screenshotUrl} target="_blank" rel="noopener noreferrer">
                  <img src={reviewPayment.screenshotUrl} alt="Payment proof" className="max-h-64 w-full rounded-lg border object-contain bg-muted" />
                </a>
              </div>
            )}

            {reviewPayment.status === "pending" && (
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setReviewPayment(null)}>Cancel</Button>
                <Button variant="destructive" className="flex-1" onClick={() => handleReview("rejected")} loading={reviewing}>
                  <ThumbsDown className="mr-2 h-4 w-4" /> Reject
                </Button>
                <Button className="flex-1" onClick={() => handleReview("approved")} loading={reviewing}>
                  <Check className="mr-2 h-4 w-4" /> Approve
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal isOpen={!!terminateTarget} onClose={() => setTerminateTarget(null)} title="Terminate Contract">
        {terminateTarget && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              End contract for <strong>{terminateTarget.roomId?.title}</strong> with <strong>{terminateTarget.studentId?.name}</strong>?
            </p>
            <p className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-950 rounded-lg p-3">
              Per-day rate: <strong>{formatPrice(terminateTarget.perDayRate)}</strong>. If the student leaves mid-month, only the days stayed are charged — not the full month.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setTerminateTarget(null)}>Cancel</Button>
              <Button variant="destructive" onClick={handleTerminate} loading={terminating}>Terminate</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
