"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import Link from "next/link"
import { Home, Loader2, Plus, CreditCard, Upload, HandCoins, Eye } from "lucide-react"
import { formatPrice } from "@/lib/utils"
import { NepaliCalendar, NepaliDateDisplay } from "@/components/ui/nepali-calendar"
import { adToBs, getNepaliMonthName, formatBsDate } from "@/lib/nepali-calendar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Modal } from "@/components/ui/modal"
import { toast } from "react-toastify"

interface RoomInfo { _id: string; title: string; photos: string[]; monthlyRent: number }
interface Contract { _id: string; roomId: RoomInfo; startDate: string; monthlyRent: number; status: string; perDayRate: number }
interface RentPay { _id: string; contractId: string; amount: number; month: number; year: number; status: string; paidAt: string; method: string }
interface AvailableRoom { _id: string; title: string; monthlyRent: number; photos: string[] }
interface MonthRow { year: number; month: number; day: number }

function computeMonths(startDate: string): MonthRow[] {
  const s = new Date(startDate)
  if (isNaN(s.getTime())) return []
  const bsStart = adToBs(s.getFullYear(), s.getMonth() + 1, s.getDate())
  const now = adToBs(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate())
  if (!bsStart || !now || typeof bsStart.year !== "number" || typeof now.year !== "number") return []
  const months: MonthRow[] = []
  let y = bsStart.year, m = bsStart.month
  const day = bsStart.date
  let maxIter = 1200
  while ((y < now.year || (y === now.year && m <= now.month)) && maxIter > 0) {
    months.push({ year: y, month: m, day })
    m++; if (m > 12) { m = 1; y++ }
    maxIter--
  }
  return months
}

export default function StudentRentalsPage() {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [payments, setPayments] = useState<RentPay[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewContract, setShowNewContract] = useState(false)
  const [availableRooms, setAvailableRooms] = useState<AvailableRoom[]>([])
  const [roomsLoading, setRoomsLoading] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState("")
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [creating, setCreating] = useState(false)
  const [showPayModal, setShowPayModal] = useState<{ cId: string; year: number; month: number; amount: number } | null>(null)
  const [paying, setPaying] = useState(false)
  const [landlordPayout, setLandlordPayout] = useState<any | null>(null)
  const [directScreenshot, setDirectScreenshot] = useState<File | null>(null)
  const [directScreenshotPreview, setDirectScreenshotPreview] = useState("")
  const [uploadingDirect, setUploadingDirect] = useState(false)

  const [showDirectModal, setShowDirectModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState<{ year: number; month: number; day: number } | null>(null)

  const [monthsMap, setMonthsMap] = useState<Record<string, MonthRow[]>>({})
  const [currentBs, setCurrentBs] = useState<{ year: number; month: number }>({ year: 0, month: 0 })

  useEffect(() => {
    const now = adToBs(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate())
    if (now) setCurrentBs({ year: now.year, month: now.month })
  }, [])

  useEffect(() => {
    if (contracts.length === 0) return
    const map: Record<string, MonthRow[]> = {}
    for (const c of contracts) {
      map[c._id] = computeMonths(c.startDate)
    }
    setMonthsMap(map)
  }, [contracts])

  const activeContracts = useMemo(() => contracts.filter(c => c.status === "active"), [contracts])
  const totalPaid = useMemo(() => payments.filter(p => p.status === "paid" || p.status === "approved").reduce((s, p) => s + p.amount, 0), [payments])

  const payMap = useMemo(() => {
    const m = new Map<string, RentPay>()
    for (const p of payments) {
      m.set(`${p.contractId}-${p.year}-${p.month}`, p)
    }
    return m
  }, [payments])

  function getPay(cId: string, y: number, m: number): RentPay | undefined {
    return payMap.get(`${cId}-${y}-${m}`)
  }

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

  function openNewContractModal() {
    setShowNewContract(true)
    setRoomsLoading(true)
    fetch("/api/rooms?limit=50&isActive=true")
      .then(res => res.json())
      .then(data => setAvailableRooms(data.rooms || []))
      .catch(() => toast.error("Failed to load rooms"))
      .finally(() => setRoomsLoading(false))
  }

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

  async function payRent(method: string, extra?: Record<string, string>) {
    if (!showPayModal) return
    setPaying(true)
    try {
      const body: Record<string, any> = { contractId: showPayModal.cId, amount: showPayModal.amount, month: showPayModal.month, year: showPayModal.year, method }
      if (extra) Object.assign(body, extra)
      const res = await fetch("/api/rental/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (res.ok) { toast.success("Payment submitted for approval"); setShowPayModal(null); fetchData() }
      else { const e = await res.json(); toast.error(e.error || "Payment failed") }
    } catch { toast.error("Something went wrong") } finally { setPaying(false) }
  }

  function handleDirectScreenshotChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setDirectScreenshot(file)
    setDirectScreenshotPreview(URL.createObjectURL(file))
  }

  async function handleDirectSubmit() {
    if (!directScreenshot) { toast.error("Upload payment screenshot"); return }
    setUploadingDirect(true)
    try {
      const formData = new FormData()
      formData.append("file", directScreenshot)
      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData })
      if (!uploadRes.ok) throw new Error("Upload failed")
      const { url } = await uploadRes.json()
      await payRent("direct", { screenshotUrl: url })
      setShowDirectModal(false)
    } catch { toast.error("Failed to submit") } finally { setUploadingDirect(false) }
  }

  function openPayModal(cId: string, year: number, month: number, amount: number) {
    setShowPayModal({ cId, year, month, amount })
    setLandlordPayout(null)
    setDirectScreenshot(null)
    setDirectScreenshotPreview("")
    fetch(`/api/landlord-payment?contractId=${cId}`)
      .then(r => r.ok ? r.json() : { landlord: null })
      .then(d => setLandlordPayout(d.landlord))
      .catch(() => setLandlordPayout(null))
  }



  return (
    <div className="mx-auto max-w-6xl space-y-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Rentals</h1>
          <p className="text-muted-foreground">Rental contracts and monthly rent payments</p>
        </div>
        {activeContracts.length === 0 && (
          <Button onClick={openNewContractModal}><Plus className="mr-2 h-4 w-4" /> New Rental</Button>
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
          <Button onClick={openNewContractModal}><Plus className="mr-2 h-4 w-4" /> Start Renting</Button>
        </CardContent></Card>
      ) : contracts.map(contract => {
        const months = monthsMap[contract._id] || []
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
                      {months.map(({ year, month, day }) => {
                        const pay = getPay(contract._id, year, month)
                        const isCurrent = year === currentBs.year && month === currentBs.month
                        return (
                          <tr key={`${year}-${month}`} className={`border-b last:border-0 ${pay?.status === "approved" || pay?.status === "paid" ? "bg-green-50 dark:bg-green-950/20" : pay?.status === "rejected" ? "bg-red-50 dark:bg-red-950/20" : pay?.status === "pending" ? "bg-yellow-50 dark:bg-yellow-950/20" : "hover:bg-secondary/50"}`}>
                            <td className="py-2.5 font-medium">{getNepaliMonthName(month)} {year}</td>
                            <td className="py-2.5">{formatPrice(contract.monthlyRent)}</td>
                            <td className="py-2.5">
                              {!pay ? (
                                isCurrent ? <Badge variant="warning">Due</Badge> : <Badge variant="destructive">Unpaid</Badge>
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
                            <td className="py-2.5">
                              <div className="flex items-center gap-1.5">
                                {!pay ? (
                                  <Button size="sm" variant="outline" onClick={() => openPayModal(contract._id, year, month, contract.monthlyRent)}>
                                    <CreditCard className="mr-1 h-3 w-3" /> Pay
                                  </Button>
                                ) : pay.status === "pending" ? (
                                  <span className="inline-flex items-center gap-1 text-xs font-medium text-yellow-600 dark:text-yellow-400">
                                    Waiting for Approval
                                  </span>
                                ) : pay.status === "approved" || pay.status === "paid" ? (
                                  <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
                                    ✓ Approved
                                  </span>
                                ) : pay.status === "rejected" ? (
                                  <Button size="sm" variant="outline" onClick={() => openPayModal(contract._id, year, month, contract.monthlyRent)}>
                                    <CreditCard className="mr-1 h-3 w-3" /> Pay Again
                                  </Button>
                                ) : (
                                  <span className="text-xs text-muted-foreground">{pay.status}</span>
                                )}
                                <Button size="sm" variant="ghost" onClick={() => setShowViewModal({ year, month, day })}>
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                              </div>
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
            {roomsLoading ? (
              <div className="flex h-10 items-center text-sm text-muted-foreground">Loading rooms...</div>
            ) : availableRooms.length === 0 ? (
              <div className="flex h-10 items-center text-sm text-muted-foreground">
                No rooms available.{" "}
                <Link href="/search" className="ml-1 text-primary underline">Browse rooms</Link>
              </div>
            ) : (
              <select value={selectedRoom} onChange={e => setSelectedRoom(e.target.value)} className="mt-1 flex h-10 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm">
                <option value="">Choose a room...</option>
                {availableRooms.map(r => (
                  <option key={r._id} value={r._id}>{r.title} - Rs.{r.monthlyRent}/mo</option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label className="text-sm font-medium">Start Date (Nepali BS)</label>
            <NepaliCalendar value={startDate} onChange={(d) => setStartDate(d)} />
          </div>
          <Button onClick={handleCreateContract} loading={creating} className="w-full">Create Contract</Button>
        </div>
      </Modal>

      <Modal isOpen={!!showPayModal} onClose={() => setShowPayModal(null)} title="Pay Rent">
        {showPayModal && (
          <div className="space-y-4">
            <div className="rounded-lg bg-muted/50 p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Month</span>
                <span className="font-medium">{getNepaliMonthName(showPayModal.month)} {showPayModal.year}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-bold text-lg text-primary">{formatPrice(showPayModal.amount)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Payment Method</p>

              {landlordPayout?.payoutMethod && (
                <button onClick={() => setShowDirectModal(true)}
                  className="flex w-full items-center gap-4 rounded-lg border border-border p-4 text-left transition-colors hover:bg-muted">
                  <HandCoins className="h-6 w-6 text-primary" />
                  <span className="font-medium">Direct Payment</span>
                  <span className="ml-auto text-xs text-muted-foreground">via {landlordPayout.payoutMethod === "bank" ? "Bank" : landlordPayout.payoutMethod === "qrcode" ? "QR Code" : landlordPayout.payoutMethod}</span>
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={showDirectModal} onClose={() => { setShowDirectModal(false); setDirectScreenshot(null); setDirectScreenshotPreview("") }} title="Direct Payment">
        {landlordPayout && (
          <div className="space-y-5 py-4">
            <div className="rounded-lg bg-muted/50 p-4 text-sm space-y-2">
              <p className="font-semibold text-foreground">Pay Directly to Landlord</p>
              <p className="text-xs text-muted-foreground">Use the details below to pay your rent directly to the landlord, then upload proof of payment.</p>
            </div>

            {showPayModal && (
              <div className="rounded-lg bg-muted/50 p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-bold text-lg text-primary">{formatPrice(showPayModal.amount)}</span>
                </div>
              </div>
            )}

            {landlordPayout.payoutQrCode && (
              <div className="flex flex-col items-center gap-2">
                <p className="text-sm font-medium">Landlord QR Code — Scan & Pay</p>
                <div className="rounded-xl border-2 bg-white p-3 shadow-sm">
                  <img src={landlordPayout.payoutQrCode} alt="Landlord QR" className="h-48 w-48 object-contain" />
                </div>
              </div>
            )}

            {(landlordPayout.payoutAccountName || landlordPayout.payoutAccountNumber || landlordPayout.payoutBankName) && (
              <div className="space-y-3 rounded-lg bg-muted/50 p-4 text-sm">
                <p className="font-semibold text-foreground">Bank / Account Details</p>
                {landlordPayout.payoutAccountName && (
                  <div className="flex justify-between"><span className="text-muted-foreground">Account Holder</span><span className="font-medium">{landlordPayout.payoutAccountName}</span></div>
                )}
                {landlordPayout.payoutAccountNumber && (
                  <div className="flex justify-between"><span className="text-muted-foreground">Account Number</span><span className="font-mono font-medium">{landlordPayout.payoutAccountNumber}</span></div>
                )}
                {landlordPayout.payoutBankName && (
                  <div className="flex justify-between"><span className="text-muted-foreground">Bank</span><span className="font-medium">{landlordPayout.payoutBankName}</span></div>
                )}
                {landlordPayout.payoutMethod && (
                  <div className="flex justify-between"><span className="text-muted-foreground">Method</span><span className="font-medium capitalize">{landlordPayout.payoutMethod}</span></div>
                )}
              </div>
            )}

            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
              <p className="text-sm font-semibold">Upload Payment Screenshot</p>
              <p className="text-xs text-muted-foreground">After paying, upload a screenshot as proof.</p>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-muted-foreground/30 p-4 hover:bg-muted/50 transition-colors">
                <Upload className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-muted-foreground">{directScreenshot ? directScreenshot.name : "Tap to upload screenshot"}</p>
                  <p className="text-xs text-muted-foreground/60">JPG, PNG, or PDF (max 5MB)</p>
                </div>
                <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleDirectScreenshotChange} />
              </label>
              {directScreenshotPreview && (
                <div className="rounded-lg border overflow-hidden">
                  <img src={directScreenshotPreview} alt="Preview" className="max-h-40 w-full object-contain bg-muted" />
                </div>
              )}
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => { setShowDirectModal(false); setDirectScreenshot(null); setDirectScreenshotPreview("") }}>Cancel</Button>
                <Button className="flex-1" onClick={handleDirectSubmit} loading={uploadingDirect} disabled={!directScreenshot}>
                  <Upload className="mr-2 h-4 w-4" /> Submit Proof
                </Button>
              </div>
            </div>

            <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-3 text-xs text-yellow-700 dark:text-yellow-400">
              After submitting proof, the landlord will verify and approve your payment.
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={!!showViewModal} onClose={() => setShowViewModal(null)} title="Rent Period Details">
        {showViewModal && (() => {
          const endM = showViewModal.month === 12 ? 1 : showViewModal.month + 1
          const endY = showViewModal.month === 12 ? showViewModal.year + 1 : showViewModal.year
          return (
            <div className="space-y-4 py-4">
              <div className="rounded-lg bg-muted/50 p-4 text-sm space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Period Start</span>
                  <span className="font-medium">{formatBsDate(showViewModal.year, showViewModal.month, showViewModal.day)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Period End</span>
                  <span className="font-medium">{formatBsDate(endY, endM, showViewModal.day)}</span>
                </div>
                <div className="border-t pt-3 flex justify-between">
                  <span className="text-muted-foreground">Month</span>
                  <span className="font-medium">{getNepaliMonthName(showViewModal.month)} {showViewModal.year}</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Rent is paid from {formatBsDate(showViewModal.year, showViewModal.month, showViewModal.day)} to {formatBsDate(endY, endM, showViewModal.day)}.
              </p>
            </div>
          )
        })()}
      </Modal>

    </div>
  )
}