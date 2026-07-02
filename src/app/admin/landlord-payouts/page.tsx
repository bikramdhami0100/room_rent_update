"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { toast } from "react-toastify"
import {
  Loader2, Wallet, IndianRupee, User, Clock, Percent, AlertTriangle, Bell, CalendarCheck,
  Search, Filter, ArrowUpDown, ArrowUp, ArrowDown, X,
} from "lucide-react"
import { useRoleGuard } from "@/hooks/useRoleGuard"
import { formatPrice } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Modal } from "@/components/ui/modal"
import { Pagination } from "@/components/ui/pagination"

interface LandlordInfo {
  _id: string
  name: string
  email: string
  phone?: string
  payoutMethod?: string
  payoutAccountName?: string
  payoutAccountNumber?: string
  payoutBankName?: string
  payoutFrequency?: string
  payoutQrCode?: string
}

interface GroupedLandlord {
  landlord: LandlordInfo
  totalPending: number
  totalPaid: number
  earnings: unknown[]
  nextPayoutDate: string | null
  payoutStatus: string
}

const FREQUENCY_LABELS: Record<string, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  thrice_monthly: "Thrice Monthly",
  half_yearly: "Half Yearly",
  yearly: "Yearly",
}

function getPayoutStatusLabel(status: string): { label: string; variant: "destructive" | "warning" | "info" | "secondary" | "success"; icon: React.ComponentType<{ className?: string }> } {
  switch (status) {
    case "overdue": return { label: "Overdue", variant: "destructive", icon: AlertTriangle }
    case "due_soon": return { label: "Due Soon", variant: "warning", icon: Bell }
    case "upcoming": return { label: "Upcoming", variant: "info", icon: Clock }
    case "normal": return { label: "Scheduled", variant: "secondary", icon: CalendarCheck }
    default: return { label: "No Schedule", variant: "secondary", icon: CalendarCheck }
  }
}

function getDaysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

const METHOD_LABELS: Record<string, string> = {
  bank: "Bank Transfer",
  esewa: "eSewa",
  khalti: "Khalti",
  qrcode: "QR Code",
}

export default function AdminLandlordPayoutsPage() {
  useRoleGuard(["admin"])

  const [grouped, setGrouped] = useState<GroupedLandlord[]>([])
  const [payouts, setPayouts] = useState<unknown[]>([])
  const [totalPending, setTotalPending] = useState(0)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const [selectedLandlord, setSelectedLandlord] = useState<GroupedLandlord | null>(null)

  /* ---- search / filter / sort / pagination ---- */
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [frequencyFilter, setFrequencyFilter] = useState("all")
  const [methodFilter, setMethodFilter] = useState("all")
  const [page, setPage] = useState(1)
  const perPage = 6

  type SortField = "name" | "pending" | "paid" | "days"
  const [sortField, setSortField] = useState<SortField>("pending")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")

  const filtered = useMemo(() => {
    let items = [...grouped]
    if (search) {
      const q = search.toLowerCase()
      items = items.filter((g) => {
        const l = g.landlord as LandlordInfo
        return l.name.toLowerCase().includes(q) || l.email.toLowerCase().includes(q) || (l.phone || "").includes(q)
      })
    }
    if (statusFilter !== "all") items = items.filter((g) => g.payoutStatus === statusFilter)
    if (frequencyFilter !== "all") items = items.filter((g) => (g.landlord as LandlordInfo).payoutFrequency === frequencyFilter)
    if (methodFilter !== "all") items = items.filter((g) => (g.landlord as LandlordInfo).payoutMethod === methodFilter)
    items.sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case "pending": cmp = a.totalPending - b.totalPending; break
        case "paid": cmp = a.totalPaid - b.totalPaid; break
        case "days": {
          const da = getDaysUntil(a.nextPayoutDate) ?? 999999
          const db = getDaysUntil(b.nextPayoutDate) ?? 999999
          cmp = da - db; break
        }
        default: cmp = (a.landlord as LandlordInfo).name.localeCompare((b.landlord as LandlordInfo).name)
      }
      return sortDir === "desc" ? -cmp : cmp
    })
    return items
  }, [grouped, search, statusFilter, frequencyFilter, methodFilter, sortField, sortDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage))
  const safePage = Math.min(page, totalPages)
  const paginated = useMemo(() => filtered.slice((safePage - 1) * perPage, safePage * perPage), [filtered, safePage])

  useEffect(() => { setPage(1) }, [search, statusFilter, frequencyFilter, methodFilter])

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    else { setSortField(field); setSortDir("desc") }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3 text-primary" /> : <ArrowDown className="h-3 w-3 text-primary" />
  }

  const hasActiveFilters = search || statusFilter !== "all" || frequencyFilter !== "all" || methodFilter !== "all"

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/landlord-earnings")
      if (res.ok) {
        const data = await res.json()
        setGrouped(data.groupedByLandlord || [])
        setPayouts(data.payouts || [])
        setTotalPending(data.totalAllPending || 0)
      }
    } catch {
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  async function handlePayout(landlordId: string) {
    setProcessing(landlordId)
    try {
      const res = await fetch("/api/admin/landlord-payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ landlordId }),
      })
      if (res.ok) {
        toast.success("Payout processed successfully")
        fetchData()
        setSelectedLandlord(null)
      } else {
        const err = await res.json()
        toast.error(err.error || "Payout failed")
      }
    } catch {
      toast.error("Something went wrong")
    } finally {
      setProcessing(null)
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 py-10">
      <div>
        <h1 className="text-3xl font-bold">Landlord Payouts</h1>
        <p className="text-muted-foreground">Manage and process landlord earnings payouts</p>
      </div>

      {/* How it works */}
      <Card>
        <CardContent className="p-4 text-sm text-muted-foreground space-y-1">
          <div className="flex items-center gap-2 font-medium text-foreground mb-1">
            <Percent className="h-4 w-4 text-primary" />
            Commission Breakdown
          </div>
          <p>• Student pays <strong>0.5%</strong> of monthly rent as commission to admin</p>
          <p>• Admin pays <strong>25% of that 0.5%</strong> to the landlord = <strong>0.125%</strong> of monthly rent</p>
          <p className="text-xs mt-1">Example: Rent NPR 10,000 → Student pays NPR 50 commission → Landlord earns NPR 12.50</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Total Pending Payout</CardTitle>
          <Wallet className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-3">
            <p className="text-3xl font-bold text-yellow-600">{formatPrice(totalPending)}</p>
            {!loading && (
              <span className="text-xs text-muted-foreground">
                across {grouped.length} landlord{grouped.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : grouped.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground">No landlords found</p>
            <p className="text-xs text-muted-foreground mt-2">Landlords need to save their payout details from their Payments & Earnings page to appear here</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Search & Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by name, email or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-9 pl-8 pr-8 rounded-md border border-input bg-background text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <option value="all">All Status</option>
              <option value="overdue">Overdue</option>
              <option value="due_soon">Due Soon</option>
              <option value="upcoming">Upcoming</option>
              <option value="normal">Scheduled</option>
              <option value="no_data">No Schedule</option>
            </select>

            <select value={frequencyFilter} onChange={(e) => setFrequencyFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <option value="all">All Frequencies</option>
              {Object.entries(FREQUENCY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>

            <select value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <option value="all">All Methods</option>
              {Object.entries(METHOD_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setStatusFilter("all"); setFrequencyFilter("all"); setMethodFilter("all") }}>
                <X className="h-4 w-4 mr-1" /> Clear
              </Button>
            )}

            <div className="ml-auto text-xs text-muted-foreground">
              {filtered.length} landlord{filtered.length !== 1 ? "s" : ""}
            </div>
          </div>

          {/* Sort bar */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground px-1">
            <Filter className="h-3 w-3" />
            <span>Sort by:</span>
            <button onClick={() => toggleSort("name")} className="inline-flex items-center gap-1 hover:text-foreground">
              Name <SortIcon field="name" />
            </button>
            <button onClick={() => toggleSort("pending")} className="inline-flex items-center gap-1 hover:text-foreground">
              Pending <SortIcon field="pending" />
            </button>
            <button onClick={() => toggleSort("paid")} className="inline-flex items-center gap-1 hover:text-foreground">
              Paid <SortIcon field="paid" />
            </button>
            <button onClick={() => toggleSort("days")} className="inline-flex items-center gap-1 hover:text-foreground">
              Next Payout <SortIcon field="days" />
            </button>
          </div>

          {/* List */}
          <div className="space-y-4">
            {paginated.map((g) => {
              const l = g.landlord as LandlordInfo
              const statusInfo = getPayoutStatusLabel(g.payoutStatus)
              const StatusIcon = statusInfo.icon
              const daysLeft = getDaysUntil(g.nextPayoutDate)
              return (
                <Card key={l._id} className={g.payoutStatus === "overdue" && g.totalPending > 0 ? "ring-1 ring-destructive/40" : ""}>
                  <CardContent className="p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex-1 min-w-0 space-y-2">
                        {/* Name row with status badge */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <User className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="font-semibold">{l.name}</span>
                          <Badge variant="outline" className="text-xs">{l.email}</Badge>
                          <Badge variant={statusInfo.variant} className="gap-1">
                            <StatusIcon className="h-3 w-3" />
                            {statusInfo.label}
                          </Badge>
                        </div>

                        {/* Amounts row */}
                        <div className="flex flex-wrap gap-4 text-sm">
                          <span>Pending: <strong className={g.totalPending > 0 ? "text-yellow-600" : "text-muted-foreground"}>{formatPrice(g.totalPending)}</strong></span>
                          <span>Paid: <strong className="text-green-600">{formatPrice(g.totalPaid)}</strong></span>
                        </div>

                        {/* Next payout countdown */}
                        {g.nextPayoutDate && g.totalPending > 0 && (
                          <div className="flex items-center gap-2 text-xs">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            {daysLeft !== null && daysLeft < 0 ? (
                              <span className="text-destructive font-medium">
                                Overdue by {Math.abs(daysLeft)} day{Math.abs(daysLeft) !== 1 ? "s" : ""}
                              </span>
                            ) : daysLeft !== null && daysLeft === 0 ? (
                              <span className="text-warning font-medium">Due today</span>
                            ) : daysLeft !== null && daysLeft <= 3 ? (
                              <span className="text-orange-600 font-medium">
                                Due in {daysLeft} day{daysLeft !== 1 ? "s" : ""} ({new Date(g.nextPayoutDate).toLocaleDateString()})
                              </span>
                            ) : daysLeft !== null ? (
                              <span className="text-muted-foreground">
                                Next payout in {daysLeft} day{daysLeft !== 1 ? "s" : ""} ({new Date(g.nextPayoutDate).toLocaleDateString()})
                              </span>
                            ) : null}
                          </div>
                        )}

                        {/* Payout details row */}
                        {l.payoutMethod && (
                          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                            <span>Method: <strong>{METHOD_LABELS[l.payoutMethod] || l.payoutMethod}</strong></span>
                            {l.payoutAccountName && <span>Account: <strong>{l.payoutAccountName}</strong></span>}
                            {l.payoutAccountNumber && <span>Number: <strong>{l.payoutAccountNumber}</strong></span>}
                            {l.payoutBankName && <span>Bank: <strong>{l.payoutBankName}</strong></span>}
                            {l.payoutFrequency && <span>Frequency: <strong>{FREQUENCY_LABELS[l.payoutFrequency] || l.payoutFrequency}</strong></span>}
                          </div>
                        )}
                        {!l.payoutMethod && (
                          <p className="text-xs text-red-500">Payout details not set by landlord</p>
                        )}
                        {l.payoutQrCode && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">QR Code:</span>
                            <img src={l.payoutQrCode} alt="Payout QR" className="h-10 w-10 rounded border object-cover cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => setSelectedLandlord(g)}
                            />
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 shrink-0 mt-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedLandlord(g)}
                        >
                          View Details
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handlePayout(l._id)}
                          loading={processing === l._id}
                          disabled={g.totalPending === 0}
                        >
                          <IndianRupee className="mr-1 h-4 w-4" />
                          Pay {formatPrice(g.totalPending)}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination page={safePage} totalPages={totalPages} total={filtered.length} onPageChange={setPage} />
          )}
        </>
      )}

      {/* Payout History */}
      {payouts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Payout History</CardTitle>
            <CardDescription>All completed payouts to landlords</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 font-medium">Landlord</th>
                    <th className="pb-3 font-medium">Amount</th>
                    <th className="pb-3 font-medium">Frequency</th>
                    <th className="pb-3 font-medium">Date</th>
                    <th className="pb-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(payouts as any[]).map((p: any) => (
                    <tr key={p._id} className="border-b last:border-0 hover:bg-secondary/50">
                      <td className="py-3">{(p.landlordId as any)?.name || "N/A"}</td>
                      <td className="py-3 font-medium">{formatPrice(p.amount)}</td>
                      <td className="py-3 text-muted-foreground">{FREQUENCY_LABELS[p.frequency] || p.frequency}</td>
                      <td className="py-3 text-muted-foreground">
                        {p.paidAt ? new Date(p.paidAt).toLocaleDateString() : new Date(p.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3">
                        <Badge variant={p.status === "paid" ? "success" : p.status === "cancelled" ? "destructive" : "warning"}>
                          {p.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detail Modal */}
      <Modal
        isOpen={!!selectedLandlord}
        onClose={() => setSelectedLandlord(null)}
        title={`Earnings: ${(selectedLandlord?.landlord as LandlordInfo)?.name || ""}`}
      >
        {selectedLandlord && (
          <div className="space-y-4">
            {(selectedLandlord.landlord as LandlordInfo).payoutMethod && (
              <div className="rounded-lg bg-muted/50 p-3 text-xs space-y-1">
                <p><strong>Method:</strong> {METHOD_LABELS[(selectedLandlord.landlord as LandlordInfo).payoutMethod!] || (selectedLandlord.landlord as LandlordInfo).payoutMethod}</p>
                {(selectedLandlord.landlord as LandlordInfo).payoutAccountName && <p><strong>Account:</strong> {(selectedLandlord.landlord as LandlordInfo).payoutAccountName}</p>}
                {(selectedLandlord.landlord as LandlordInfo).payoutAccountNumber && <p><strong>Number:</strong> {(selectedLandlord.landlord as LandlordInfo).payoutAccountNumber}</p>}
                {(selectedLandlord.landlord as LandlordInfo).payoutBankName && <p><strong>Bank:</strong> {(selectedLandlord.landlord as LandlordInfo).payoutBankName}</p>}
                {(selectedLandlord.landlord as LandlordInfo).payoutFrequency && <p><strong>Frequency:</strong> {FREQUENCY_LABELS[(selectedLandlord.landlord as LandlordInfo).payoutFrequency!] || (selectedLandlord.landlord as LandlordInfo).payoutFrequency}</p>}
                {(selectedLandlord.landlord as LandlordInfo).payoutQrCode && (
                  <div className="pt-2">
                    <p className="mb-1"><strong>QR Code:</strong></p>
                    <img src={(selectedLandlord.landlord as LandlordInfo).payoutQrCode} alt="Payout QR" className="max-h-48 rounded border object-contain" />
                  </div>
                )}
              </div>
            )}

            {/* Next Payout Schedule */}
            {selectedLandlord.nextPayoutDate && selectedLandlord.totalPending > 0 && (
              <div className={`rounded-lg p-3 text-xs space-y-1 ${
                selectedLandlord.payoutStatus === "overdue" ? "bg-destructive/10 text-destructive" :
                selectedLandlord.payoutStatus === "due_soon" ? "bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400" :
                "bg-muted/50 text-muted-foreground"
              }`}>
                <p className="font-medium">Payout Schedule</p>
                <p>Next payout: {new Date(selectedLandlord.nextPayoutDate).toLocaleDateString()}</p>
                <p>Frequency: {FREQUENCY_LABELS[(selectedLandlord.landlord as LandlordInfo).payoutFrequency || ""] || (selectedLandlord.landlord as LandlordInfo).payoutFrequency || "N/A"}</p>
                {getDaysUntil(selectedLandlord.nextPayoutDate) !== null && (
                  <p>
                    {getDaysUntil(selectedLandlord.nextPayoutDate)! < 0
                      ? `Overdue by ${Math.abs(getDaysUntil(selectedLandlord.nextPayoutDate)!)} days`
                      : `Due in ${getDaysUntil(selectedLandlord.nextPayoutDate)} days`
                    }
                  </p>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-xl font-bold text-yellow-600">{formatPrice(selectedLandlord.totalPending)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Paid Out</p>
                <p className="text-xl font-bold text-green-600">{formatPrice(selectedLandlord.totalPaid)}</p>
              </div>
            </div>
            <div className="max-h-60 overflow-y-auto space-y-2">
              {selectedLandlord.earnings.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-4">No commission earnings yet</p>
              ) : (
                selectedLandlord.earnings.map((e: any) => (
                  <div key={e._id} className="flex justify-between items-center border-b pb-2 text-sm">
                    <div>
                      <p className="font-medium">{formatPrice(e.landlordShare)}</p>
                      <p className="text-xs text-muted-foreground">From commission: {formatPrice(e.studentCommission)}</p>
                    </div>
                    <Badge variant={e.status === "paid" ? "success" : "warning"}>
                      {e.status}
                    </Badge>
                  </div>
                ))
              )}
            </div>
            <Button
              className="w-full"
              onClick={() => handlePayout((selectedLandlord.landlord as LandlordInfo)._id)}
              loading={processing === (selectedLandlord.landlord as LandlordInfo)._id}
              disabled={selectedLandlord.totalPending === 0}
            >
              <IndianRupee className="mr-2 h-4 w-4" />
              {selectedLandlord.totalPending > 0
                ? `Process Payout - ${formatPrice(selectedLandlord.totalPending)}`
                : "No Pending Payouts"}
            </Button>
          </div>
        )}
      </Modal>
    </div>
  )
}
