"use client"

import { useEffect, useState, useCallback } from "react"
import { toast } from "react-toastify"
import { Loader2, Search, CheckCircle2, XCircle, ExternalLink, Eye, EyeOff, ImageIcon, Filter } from "lucide-react"
import { useRoleGuard } from "@/hooks/useRoleGuard"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Modal } from "@/components/ui/modal"
import { formatPrice } from "@/lib/utils"

interface PaymentItem {
  _id: string
  amount: number
  method: string
  status: string
  screenshotUrl?: string
  transactionId?: string
  createdAt: string
  studentId: { _id: string; name: string; email: string; phone?: string }
  roomId: { _id: string; title: string; monthlyRent: number; location: string }
  bankId?: { _id: string; bankName: string; accountHolderName: string; accountNumber: string }
}

export default function AdminPaymentsPage() {
  useRoleGuard(["admin"])

  const [payments, setPayments] = useState<PaymentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [methodFilter, setMethodFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("pending")
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [processing, setProcessing] = useState<string | null>(null)

  const fetchPayments = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (methodFilter !== "all") params.set("method", methodFilter)
      if (statusFilter !== "all") params.set("status", statusFilter)
      const res = await fetch(`/api/admin/payments?${params}`)
      if (res.ok) {
        const data = await res.json()
        setPayments(data.payments || [])
      }
    } catch {} finally {
      setLoading(false)
    }
  }, [methodFilter, statusFilter])

  useEffect(() => { fetchPayments() }, [fetchPayments])

  async function handleAction(paymentId: string, action: "verify" | "reject") {
    setProcessing(paymentId)
    try {
      const res = await fetch("/api/admin/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId, action }),
      })
      if (res.ok) {
        toast.success(action === "verify" ? "Payment verified" : "Payment rejected")
        fetchPayments()
      } else {
        const err = await res.json()
        toast.error(err.error || "Action failed")
      }
    } catch {
      toast.error("Something went wrong")
    } finally {
      setProcessing(null)
    }
  }

  const filteredPayments = payments.filter((p) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      p.studentId?.name?.toLowerCase().includes(q) ||
      p.studentId?.email?.toLowerCase().includes(q) ||
      p._id.toLowerCase().includes(q) ||
      p.roomId?.title?.toLowerCase().includes(q)
    )
  })

  function getMethodBadge(method: string) {
    switch (method) {
      case "khalti": return <Badge variant="info">Khalti</Badge>
      case "esewa": return <Badge variant="info">eSewa</Badge>
      case "qrcode": return <Badge variant="warning">QR Code</Badge>
      case "bank": return <Badge variant="secondary">Bank</Badge>
      default: return <Badge>{method}</Badge>
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "paid": return <Badge variant="success">Paid</Badge>
      case "pending": return <Badge variant="warning">Pending</Badge>
      case "overdue": return <Badge variant="destructive">Overdue</Badge>
      default: return <Badge>{status}</Badge>
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 py-10">
      <div>
        <h1 className="text-3xl font-bold">Payment Management</h1>
        <p className="text-muted-foreground">Verify and manage QR code and bank transfer payments</p>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative max-w-sm flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Search by student, room..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="flex h-10 w-full rounded-lg border border-input bg-transparent pl-10 pr-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)}
            className="h-10 rounded-lg border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <option value="all">All Methods</option>
            <option value="khalti">Khalti</option>
            <option value="esewa">eSewa</option>
            <option value="qrcode">QR Code</option>
            <option value="bank">Bank Transfer</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-lg border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
            <option value="all">All Status</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : filteredPayments.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">No payments found</CardContent></Card>
      ) : (
        <div className="space-y-4">
          {filteredPayments.map((payment) => (
            <Card key={payment._id} className="overflow-hidden">
              <CardContent className="p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{payment.studentId?.name || "Unknown"}</span>
                      {getMethodBadge(payment.method)}
                      {getStatusBadge(payment.status)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {payment.studentId?.email} &middot; {payment.studentId?.phone || "N/A"}
                    </p>
                    <div className="flex gap-3 text-sm">
                      <span className="text-muted-foreground">Room:</span>
                      <span className="font-medium truncate">{payment.roomId?.title || "N/A"}</span>
                    </div>
                    <div className="flex gap-3 text-sm">
                      <span className="text-muted-foreground">Amount:</span>
                      <span className="font-bold text-primary">{formatPrice(payment.amount)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(payment.createdAt).toLocaleString()}
                    </p>
                    {payment.bankId && (
                      <div className="text-xs bg-muted/50 rounded p-2 space-y-1">
                        <p><span className="text-muted-foreground">Bank:</span> {payment.bankId.bankName}</p>
                        <p><span className="text-muted-foreground">Account:</span> {payment.bankId.accountHolderName} - {payment.bankId.accountNumber}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {(payment.method === "qrcode" || payment.method === "bank") && payment.status === "pending" && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="text-green-600 border-green-600/30 hover:bg-green-600/10"
                          onClick={() => handleAction(payment._id, "verify")}
                          loading={processing === payment._id}>
                          <CheckCircle2 className="mr-1 h-4 w-4" />
                          Verify
                        </Button>
                        <Button size="sm" variant="outline" className="text-red-600 border-red-600/30 hover:bg-red-600/10"
                          onClick={() => handleAction(payment._id, "reject")}>
                          <XCircle className="mr-1 h-4 w-4" />
                          Reject
                        </Button>
                      </div>
                    )}
                    {payment.method === "khalti" && payment.transactionId && (
                      <p className="text-xs text-muted-foreground">Txn: {payment.transactionId}</p>
                    )}
                    {payment.screenshotUrl && (
                      <Button size="sm" variant="outline" onClick={() => setPreviewUrl(payment.screenshotUrl!)}>
                        <ImageIcon className="mr-1 h-4 w-4" />
                        View Proof
                      </Button>
                    )}
                    {payment.status === "paid" && payment.paidAt && (
                      <p className="text-xs text-green-600">Paid: {new Date(payment.paidAt).toLocaleString()}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={!!previewUrl} onClose={() => setPreviewUrl(null)} title="Payment Proof">
        {previewUrl && (
          <div className="flex justify-center">
            <img src={previewUrl} alt="Payment proof" className="max-h-[70vh] w-auto rounded-lg object-contain" />
          </div>
        )}
        <div className="flex justify-end mt-4">
          <Button variant="outline" onClick={() => setPreviewUrl(null)}>
            <EyeOff className="mr-2 h-4 w-4" />
            Close
          </Button>
        </div>
      </Modal>
    </div>
  )
}