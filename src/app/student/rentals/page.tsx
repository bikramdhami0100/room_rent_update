"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { Home, CheckCircle, Clock, Loader2, Plus, CreditCard } from "lucide-react"
import { formatPrice } from "@/lib/utils"
import { NepaliCalendar, NepaliDateDisplay } from "@/components/ui/nepali-calendar"
import { adToBs, getNepaliMonthName } from "@/lib/nepali-calendar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Modal } from "@/components/ui/modal"
import { toast } from "react-toastify"

interface RoomInfo { _id: string; title: string; photos: string[]; monthlyRent: number }
interface Contract { _id: string; roomId: RoomInfo; startDate: string; monthlyRent: number; status: string; perDayRate: number }
interface RentPay { _id: string; contractId: string; amount: number; month: number; year: number; status: string; paidAt: string; method: string }

export default function StudentRentalsPage() {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [payments, setPayments] = useState<RentPay[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewContract, setShowNewContract] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState("")
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [creating, setCreating] = useState(false)
  const [showPayModal, setShowPayModal] = useState<{ cId: string; year: number; month: number; amount: number } | null>(null)
  const [payMethod, setPayMethod] = useState("cash")
  const [paying, setPaying] = useState(false)

  const activeContracts = contracts.filter(c => c.status === "active")
  const totalPaid = payments.filter(p => p.status === "paid").reduce((s, p) => s + p.amount, 0)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/student/rental-payments")
      if (res.ok) {
        const d = await res.json()
        setContracts(d.contracts || [])
        setPayments(d.payments || [])
      }
    } catch { toast.error("Failed to load rentals") } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleCreateContract() {
    if (!selectedRoom || !startDate) { toast.error("Select room and start date"); return }
    setCreating(true)
    try {
      const res = await fetch("/api/rental/contract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: selectedRoom, startDate: startDate.toISOString() }),
      })
      if (res.ok) { toast.success("Contract created"); setShowNewContract(false); fetchData() }
      else { const e = await res.json(); toast.error(e.error || "Failed") }
    } catch { toast.error("Something went wrong") } finally { setCreating(false) }
  }

  async function handlePayRent() {
    if (!showPayModal) return
    setPaying(true)
    try {
      const res = await fetch("/api/rental/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractId: showPayModal.cId, amount: showPayModal.amount, month: showPayModal.month, year: showPayModal.year, method: payMethod }),
      })
      if (res.ok) { toast.success("Rent paid"); setShowPayModal(null); fetchData() }
      else { const e = await res.json(); toast.error(e.error || "Payment failed") }
    } catch { toast.error("Something went wrong") } finally { setPaying(false) }
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Rentals</h1>
          <p className="text-muted-foreground">Rental contracts and monthly rent payments</p>
        </div>
        {activeContracts.length === 0 && (
          <Button onClick={() => setShowNewContract(true)}><Plus className="mr-2 h-4 w-4" /> New Rental</Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Active</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{activeContracts.length}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Paid</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-green-600">{formatPrice(totalPaid)}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Contracts</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{contracts.length}</p></CardContent></Card>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : contracts.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center gap-4 py-12">
          <Home className="h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">No rental contracts yet</p>
          <Button onClick={() => setShowNewContract(true)}><Plus className="mr-2 h-4 w-4" /> Start Renting</Button>
        </CardContent></Card>
      ) : contracts.map(contract => {
        const months = getMonths(contract.startDate)
        const isActive = contract.status === "active"
        return (
          <Card key={contract._id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {contract.roomId?.photos?.[0] && <img src={contract.roomId.photos[0]} alt="" className="h-14 w-20 rounded-lg object-cover" />}
                  <div>
                    <CardTitle>{contract.roomId?.title || "Unknown"}</CardTitle>
                    <CardDescription><NepaliDateDisplay date={new Date(contract.startDate)} /></CardDescription>
                  </div>
                </div>
                <Badge variant={isActive ? "success" : "secondary"}>{contract.status}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-3 flex gap-4 text-sm">
                <span className="text-muted-foreground">Rent: <strong>{formatPrice(contract.monthlyRent)}/mo</strong></span>
                {isActive && <span className="text-muted-foreground">Per day: <strong>{formatPrice(contract.perDayRate)}</strong></span>}
              </div>
              {isActive && months.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b text-left">
                      <th className="pb-2 font-medium">Month (BS)</th>
                      <th className="pb-2 font-medium">Amount</th>
                      <th className="pb-2 font-medium">Status</th>
                      <th className="pb-2 font-medium">Paid</th>
                      <th className="pb-2 font-medium">Action</th>
                    </tr></thead>
                    <tbody>
                      {months.map(({ year, month }) => {
                        const pay = getPay(contract._id, year, month)
                        const isCurrent = year === (adToBs(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate())?.year || 0) &&
                          month === (adToBs(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate())?.month || 0)
                        return (
                          <tr key={`${year}-${month}`} className="border-b last:border-0 hover:bg-secondary/50">
                            <td className="py-2.5 font-medium">{getNepaliMonthName(month)} {year}</td>
                            <td className="py-2.5">{formatPrice(contract.monthlyRent)}</td>
                            <td className="py-2.5">
                              {pay ? <Badge variant="success">Paid</Badge> : isCurrent ? <Badge variant="warning">Due</Badge> : <Badge variant="destructive">Unpaid</Badge>}
                            </td>
                            <td className="py-2.5 text-muted-foreground">{pay?.paidAt ? new Date(pay.paidAt).toLocaleDateString() : "-"}</td>
                            <td className="py-2.5">
                              {!pay && (
                                <Button size="sm" variant="outline" onClick={() => setShowPayModal({ cId: contract._id, year, month, amount: contract.monthlyRent })}>
                                  <CreditCard className="mr-1 h-3 w-3" /> Pay
                                </Button>
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

      <Modal isOpen={showNewContract} onClose={() => setShowNewContract(false)} title="New Rental Contract">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Select Room</label>
            <select value={selectedRoom} onChange={e => setSelectedRoom(e.target.value)} className="mt-1 flex h-10 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm">
              <option value="">Choose a room...</option>
            </select>
            <p className="mt-1 text-xs text-muted-foreground"><Link href="/search" className="text-primary underline">Browse rooms</Link> to find available listings</p>
          </div>
          <div>
            <label className="text-sm font-medium">Start Date (Nepali BS)</label>
            <NepaliCalendar onChange={(d) => setStartDate(d)} />
          </div>
          <Button onClick={handleCreateContract} loading={creating} className="w-full">Create Contract</Button>
        </div>
      </Modal>

      <Modal isOpen={!!showPayModal} onClose={() => setShowPayModal(null)} title="Pay Rent">
        {showPayModal && (
          <div className="space-y-4">
            <div className="text-sm">
              <p>Month: <strong>{getNepaliMonthName(showPayModal.month)} {showPayModal.year}</strong></p>
              <p>Amount: <strong>{formatPrice(showPayModal.amount)}</strong></p>
            </div>
            <div>
              <label className="text-sm font-medium">Payment Method</label>
              <select value={payMethod} onChange={e => setPayMethod(e.target.value)} className="mt-1 flex h-10 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm">
                <option value="cash">Cash</option>
                <option value="bank">Bank Transfer</option>
                <option value="esewa">eSewa</option>
                <option value="khalti">Khalti</option>
                <option value="qrcode">QR Code</option>
              </select>
            </div>
            <Button onClick={handlePayRent} loading={paying} className="w-full"><CreditCard className="mr-2 h-4 w-4" /> Pay Now</Button>
          </div>
        )}
      </Modal>
    </div>
  )
}
