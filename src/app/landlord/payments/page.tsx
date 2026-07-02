"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { Search, Save, Wallet, Clock, IndianRupee, Loader2 } from "lucide-react"
import { formatPrice, calculateLandlordShare } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Pagination } from "@/components/ui/pagination"
import { Button } from "@/components/ui/button"
import { useDataTable, SortIcon } from "@/hooks/useDataTable"

interface Payment {
  _id: string
  roomId: { title: string }
  studentId: { name: string; email: string }
  amount: number
  status: string
  createdAt: string
}

interface PayoutDetails {
  payoutMethod?: string
  payoutAccountName?: string
  payoutAccountNumber?: string
  payoutBankName?: string
  payoutQrCode?: string
  payoutFrequency?: string
}

interface Earning {
  _id: string
  studentCommission: number
  landlordShare: number
  status: string
  paymentId: { method: string; createdAt: string }
  createdAt: string
}

interface Payout {
  _id: string
  amount: number
  frequency: string
  status: string
  paidAt: string
  note?: string
  createdAt: string
}

const FREQUENCY_LABELS: Record<string, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  thrice_monthly: "Thrice Monthly",
  half_yearly: "Half Yearly",
  yearly: "Yearly",
}

const METHOD_LABELS: Record<string, string> = {
  bank: "Bank Transfer",
  esewa: "eSewa",
  khalti: "Khalti",
  qrcode: "QR Code",
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showPayoutForm, setShowPayoutForm] = useState(false)

  const [payoutDetails, setPayoutDetails] = useState<PayoutDetails>({})
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState("")
  const [qrUploading, setQrUploading] = useState(false)

  const [earnings, setEarnings] = useState<Earning[]>([])
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [summary, setSummary] = useState({ totalEarned: 0, totalPending: 0, totalPaid: 0 })
  const [earningsLoading, setEarningsLoading] = useState(true)

  const {
    search, sort, page, limit,
    queryString, handleSearch, handleSort, handlePageChange,
  } = useDataTable(20)

  const fetchPayments = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/payment?role=landlord&${queryString}`)
      if (res.ok) {
        const data = await res.json()
        setPayments(data.payments)
        setTotal(data.total)
        setTotalPages(data.totalPages)
      }
    } catch {
    } finally {
      setLoading(false)
    }
  }, [queryString])

  const fetchEarnings = useCallback(async () => {
    setEarningsLoading(true)
    try {
      const res = await fetch("/api/landlord/earnings")
      if (res.ok) {
        const data = await res.json()
        setEarnings(data.earnings || [])
        setPayouts(data.payouts || [])
        setSummary(data.summary || { totalEarned: 0, totalPending: 0, totalPaid: 0 })
      }
    } catch {
    } finally {
      setEarningsLoading(false)
    }
  }, [])

  const fetchPayoutDetails = useCallback(async () => {
    try {
      const res = await fetch("/api/landlord/payout-details")
      if (res.ok) {
        setPayoutDetails(await res.json())
      }
    } catch {}
  }, [])

  useEffect(() => {
    fetchPayments()
    fetchEarnings()
    fetchPayoutDetails()
  }, [fetchPayments, fetchEarnings, fetchPayoutDetails])

  const totalReceived = useMemo(
    () => payments.filter((p) => p.status === "paid").reduce((sum, p) => sum + p.amount, 0),
    [payments],
  )

  const filteredPayments = useMemo(() => {
    if (!search.trim()) return payments
    const q = search.toLowerCase()
    return payments.filter(
      (p) =>
        p.roomId?.title?.toLowerCase().includes(q) ||
        p.studentId?.name?.toLowerCase().includes(q) ||
        p.studentId?.email?.toLowerCase().includes(q),
    )
  }, [payments, search])

  const hasPayoutDetails = useMemo(
    () => !!(payoutDetails.payoutMethod || payoutDetails.payoutAccountName || payoutDetails.payoutAccountNumber || payoutDetails.payoutBankName || payoutDetails.payoutQrCode || payoutDetails.payoutFrequency),
    [payoutDetails],
  )

  async function handleSavePayoutDetails() {
    setSaving(true)
    setSaveMsg("")
    try {
      const res = await fetch("/api/landlord/payout-details", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payoutDetails),
      })
      if (res.ok) {
        setSaveMsg("saved")
        setTimeout(() => setSaveMsg(""), 2500)
      } else {
        const err = await res.json()
        setSaveMsg("error-" + (err.error || "Failed to save"))
        setTimeout(() => setSaveMsg(""), 4000)
      }
    } catch {
      setSaveMsg("error-Something went wrong")
      setTimeout(() => setSaveMsg(""), 4000)
    } finally {
      setSaving(false)
    }
  }

  async function handleDeletePayoutDetails() {
    if (!confirm("Are you sure you want to clear all payout details?")) return
    setSaving(true)
    setSaveMsg("")
    try {
      const res = await fetch("/api/landlord/payout-details", { method: "DELETE" })
      if (res.ok) {
        setPayoutDetails({})
        setSaveMsg("deleted")
        setTimeout(() => setSaveMsg(""), 2500)
      } else {
        setSaveMsg("error-Failed to clear")
        setTimeout(() => setSaveMsg(""), 4000)
      }
    } catch {
      setSaveMsg("error-Something went wrong")
      setTimeout(() => setSaveMsg(""), 4000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 py-10">
      <div>
        <h1 className="text-3xl font-bold">Payments & Earnings</h1>
        <p className="text-muted-foreground">Student commission payments and your earnings</p>
      </div>

      {/* Earnings Summary */}
      {earningsLoading ? (
        <p className="text-muted-foreground">Loading earnings...</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Earned</CardTitle>
              <IndianRupee className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatPrice(summary.totalEarned)}</p>
              <p className="text-xs text-muted-foreground">Lifetime earnings (25% of commission)</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending Payout</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-yellow-600">{formatPrice(summary.totalPending)}</p>
              <p className="text-xs text-muted-foreground">Awaiting admin payout</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Paid Out</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">{formatPrice(summary.totalPaid)}</p>
              <p className="text-xs text-muted-foreground">Already received</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Commission info */}
      <Card>
        <CardContent className="p-4 text-sm text-muted-foreground">
          Students pay <strong>0.5%</strong> commission on monthly rent to admin. You earn <strong>25%</strong> of that commission (<strong>0.125%</strong> of rent) as your share.
        </CardContent>
      </Card>

      {/* Payout Details Form */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle>Payout Details</CardTitle>
              {hasPayoutDetails && (
                <span className="inline-flex items-center rounded-full bg-green-500/15 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">
                  Saved
                </span>
              )}
            </div>
            <CardDescription>Set your payment method and payout frequency for receiving your earnings from admin</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowPayoutForm(!showPayoutForm)}>
            {showPayoutForm ? "Hide" : hasPayoutDetails ? "Update" : "Set Up"}
          </Button>
        </CardHeader>
        {showPayoutForm && (
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Payout Method</label>
                <select
                  value={payoutDetails.payoutMethod || ""}
                  onChange={(e) => setPayoutDetails({ ...payoutDetails, payoutMethod: e.target.value })}
                  className="flex h-10 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
                >
                  <option value="">Select method</option>
                  <option value="bank">Bank Transfer</option>
                  <option value="esewa">eSewa</option>
                  <option value="khalti">Khalti</option>
                  <option value="qrcode">QR Code</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Payout Frequency</label>
                <select
                  value={payoutDetails.payoutFrequency || ""}
                  onChange={(e) => setPayoutDetails({ ...payoutDetails, payoutFrequency: e.target.value })}
                  className="flex h-10 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
                >
                  <option value="">Select frequency</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="thrice_monthly">Thrice Monthly</option>
                  <option value="half_yearly">Half Yearly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Account Holder Name</label>
                <input
                  type="text"
                  value={payoutDetails.payoutAccountName || ""}
                  onChange={(e) => setPayoutDetails({ ...payoutDetails, payoutAccountName: e.target.value })}
                  placeholder="e.g. John Doe"
                  className="flex h-10 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Account Number / Phone</label>
                <input
                  type="text"
                  value={payoutDetails.payoutAccountNumber || ""}
                  onChange={(e) => setPayoutDetails({ ...payoutDetails, payoutAccountNumber: e.target.value })}
                  placeholder="Account number or eSewa/Khalti phone"
                  className="flex h-10 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Bank Name (if bank transfer)</label>
                <input
                  type="text"
                  value={payoutDetails.payoutBankName || ""}
                  onChange={(e) => setPayoutDetails({ ...payoutDetails, payoutBankName: e.target.value })}
                  placeholder="e.g. Nepal Bank Limited"
                  className="flex h-10 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium mb-2 block">QR Code Image (for QR payment)</label>

                {!payoutDetails.payoutQrCode ? (
                  <label
                    className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-all cursor-pointer
                      ${qrUploading
                        ? "border-muted-foreground/30 bg-muted/30 pointer-events-none"
                        : "border-muted-foreground/30 hover:border-primary/50 hover:bg-primary/5"
                      }`}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      disabled={qrUploading}
                      className="sr-only"
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        setQrUploading(true)
                        try {
                          const fd = new FormData()
                          fd.append("file", file)
                          const res = await fetch("/api/upload", { method: "POST", body: fd })
                          if (res.ok) {
                            const { url } = await res.json()
                            setPayoutDetails({ ...payoutDetails, payoutQrCode: url })
                          }
                        } catch {
                        } finally {
                          setQrUploading(false)
                        }
                      }}
                    />
                    {qrUploading ? (
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-8 w-8 animate-spin" />
                        <span className="text-sm">Uploading...</span>
                      </div>
                    ) : (
                      <>
                        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                          <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                          </svg>
                        </div>
                        <p className="text-sm font-medium text-foreground">Upload QR Code</p>
                        <p className="text-xs text-muted-foreground mt-1">Click to browse or drag an image</p>
                        <p className="text-xs text-muted-foreground mt-0.5">PNG, JPG or WEBP (max 5MB)</p>
                      </>
                    )}
                  </label>
                ) : (
                  <div className="flex items-center gap-4 rounded-xl border bg-card p-4">
                    <div className="relative shrink-0">
                      <img
                        src={payoutDetails.payoutQrCode}
                        alt="QR Code"
                        className="h-24 w-24 rounded-lg border object-cover shadow-sm"
                      />
                      <div className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-green-500 shadow">
                        <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{payoutDetails.payoutQrCode.split("/").pop()}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">QR Code uploaded</p>
                    </div>
                    <button
                      type="button"
                      className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 dark:hover:bg-red-950"
                      onClick={() => setPayoutDetails({ ...payoutDetails, payoutQrCode: "" })}
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="mt-4 flex items-center gap-3 flex-wrap">
              <Button onClick={handleSavePayoutDetails} loading={saving}>
                <Save className="mr-2 h-4 w-4" />
                {hasPayoutDetails ? "Update Details" : "Save Details"}
              </Button>
              {hasPayoutDetails && (
                <Button variant="outline" size="sm" onClick={handleDeletePayoutDetails} loading={saving}>
                  Clear All
                </Button>
              )}
              {saveMsg === "saved" && (
                <span className="inline-flex items-center gap-1 text-sm text-green-600">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                  Saved successfully
                </span>
              )}
              {saveMsg === "deleted" && (
                <span className="inline-flex items-center gap-1 text-sm text-green-600">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                  Cleared successfully
                </span>
              )}
              {saveMsg.startsWith("error-") && (
                <span className="inline-flex items-center gap-1 text-sm text-red-600">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  {saveMsg.slice(6)}
                </span>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Student Payments */}
      <Card>
        <CardHeader>
          <CardTitle>Commission Payments from Students</CardTitle>
          <CardDescription>These are the 0.5% commission payments students paid for your rooms</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground">Loading payments...</p>
          ) : payments.length === 0 && !search ? (
            <p className="text-center text-muted-foreground">No payments yet</p>
          ) : (
            <>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search by room, student name or email..."
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="flex h-10 w-full rounded-lg border border-input bg-transparent pl-10 pr-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="cursor-pointer select-none pb-3 font-medium" onClick={() => handleSort("roomId")}>
                        Room <SortIcon sort={sort} column="roomId" />
                      </th>
                      <th className="pb-3 font-medium">Student</th>
                      <th className="cursor-pointer select-none pb-3 font-medium" onClick={() => handleSort("amount")}>
                        Commission (100%) <SortIcon sort={sort} column="amount" />
                      </th>
                      <th className="pb-3 font-medium">Your Share (25%)</th>
                      <th className="cursor-pointer select-none pb-3 font-medium" onClick={() => handleSort("createdAt")}>
                        Date <SortIcon sort={sort} column="createdAt" />
                      </th>
                      <th className="cursor-pointer select-none pb-3 font-medium" onClick={() => handleSort("status")}>
                        Status <SortIcon sort={sort} column="status" />
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayments.map((p) => (
                      <tr key={p._id} className="border-b last:border-0 hover:bg-secondary/50">
                        <td className="py-3">{p.roomId?.title || "N/A"}</td>
                        <td className="py-3 text-muted-foreground">{p.studentId?.name || "N/A"}</td>
                        <td className="py-3 font-medium">{formatPrice(p.amount)}</td>
                        <td className="py-3 text-muted-foreground">{formatPrice(calculateLandlordShare(p.amount))}</td>
                        <td className="py-3 text-muted-foreground">
                          {new Date(p.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3">
                          <Badge
                            variant={
                              p.status === "paid"
                                ? "success"
                                : p.status === "overdue"
                                  ? "destructive"
                                  : "warning"
                            }
                          >
                            {p.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredPayments.length === 0 && search && (
                <p className="py-8 text-center text-muted-foreground">No payments match your search</p>
              )}
              <Pagination page={page} totalPages={totalPages} total={total} onPageChange={handlePageChange} />
            </>
          )}
        </CardContent>
      </Card>

      {/* Earnings History */}
      {earnings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Earnings History (25% Share)</CardTitle>
            <CardDescription>Record of your share from each commission payment</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 font-medium">Student Commission</th>
                    <th className="pb-3 font-medium">Your Share</th>
                    <th className="pb-3 font-medium">Payment Method</th>
                    <th className="pb-3 font-medium">Date</th>
                    <th className="pb-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {earnings.map((e) => (
                    <tr key={e._id} className="border-b last:border-0 hover:bg-secondary/50">
                      <td className="py-3">{formatPrice(e.studentCommission)}</td>
                      <td className="py-3 font-medium">{formatPrice(e.landlordShare)}</td>
                      <td className="py-3 text-muted-foreground">{e.paymentId?.method || "N/A"}</td>
                      <td className="py-3 text-muted-foreground">
                        {new Date(e.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3">
                        <Badge variant={e.status === "paid" ? "success" : "warning"}>
                          {e.status === "paid" ? "Paid Out" : "Pending"}
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

      {/* Payout History */}
      {payouts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Payout History</CardTitle>
            <CardDescription>Payments received from admin</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 font-medium">Amount</th>
                    <th className="pb-3 font-medium">Frequency</th>
                    <th className="pb-3 font-medium">Date</th>
                    <th className="pb-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.map((p) => (
                    <tr key={p._id} className="border-b last:border-0 hover:bg-secondary/50">
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
    </div>
  )
}
