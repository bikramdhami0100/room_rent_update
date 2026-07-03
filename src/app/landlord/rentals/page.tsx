"use client"

import { useEffect, useState, useCallback } from "react"
import { Users, Loader2, X } from "lucide-react"
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
interface RentPay { _id: string; contractId: string; amount: number; month: number; year: number; status: string; paidAt: string; method: string }

export default function LandlordRentalsPage() {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [payments, setPayments] = useState<RentPay[]>([])
  const [loading, setLoading] = useState(true)
  const [terminateTarget, setTerminateTarget] = useState<Contract | null>(null)
  const [terminating, setTerminating] = useState(false)

  const activeContracts = contracts.filter(c => c.status === "active")
  const totalCollected = payments.reduce((s, p) => s + p.amount, 0)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [cr, pr] = await Promise.all([
        fetch("/api/rental/contract"),
        fetch("/api/landlord/rental-payments"),
      ])
      if (cr.ok) setContracts((await cr.json()).contracts || [])
      if (pr.ok) setPayments((await pr.json()).payments || [])
    } catch { toast.error("Failed to load data") } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

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
    const s = new Date(startDate)
    const bsStart = adToBs(s.getFullYear(), s.getMonth() + 1, s.getDate())
    const now = adToBs(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate())
    if (!bsStart || !now) return []
    const months: { year: number; month: number }[] = []
    let y = bsStart.year, m = bsStart.month
    while (y < now.year || (y === now.year && m <= now.month)) {
      months.push({ year: y, month: m })
      m++; if (m > 12) { m = 1; y++ }
    }
    return months
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 py-10">
      <div>
        <h1 className="text-3xl font-bold">Rental Management</h1>
        <p className="text-muted-foreground">Track student rent payments month by month</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Active Tenants</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{activeContracts.length}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Collected</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-green-600">{formatPrice(totalCollected)}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Contracts</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{contracts.length}</p></CardContent></Card>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : contracts.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center gap-4 py-12">
          <Users className="h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">No rental contracts yet</p>
        </CardContent></Card>
      ) : contracts.map(contract => {
        const months = getMonths(contract.startDate)
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
                <span className="text-muted-foreground">Started: <NepaliDateDisplay date={new Date(contract.startDate)} /></span>
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
                    </tr></thead>
                    <tbody>
                      {months.map(({ year, month }) => {
                        const pay = getPay(contract._id, year, month)
                        return (
                          <tr key={`${year}-${month}`} className="border-b last:border-0 hover:bg-secondary/50">
                            <td className="py-2.5 font-medium">{getNepaliMonthName(month)} {year}</td>
                            <td className="py-2.5">{formatPrice(contract.monthlyRent)}</td>
                            <td className="py-2.5">{pay ? <Badge variant="success">Paid</Badge> : <Badge variant="destructive">Unpaid</Badge>}</td>
                            <td className="py-2.5 text-muted-foreground">{pay?.paidAt ? new Date(pay.paidAt).toLocaleDateString() : "-"}</td>
                            <td className="py-2.5 text-muted-foreground">{pay?.method || "-"}</td>
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
