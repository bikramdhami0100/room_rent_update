"use client"

import { useEffect, useState } from "react"
import { Download, IndianRupee, Users, Building2, UserCheck, Loader2 } from "lucide-react"
import { formatPrice } from "@/lib/utils"
import { toast } from "react-toastify"
import { useRoleGuard } from "@/hooks/useRoleGuard"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"

interface ReportData {
  summary: {
    totalCommission: number
    totalStudents: number
    totalRooms: number
    totalLandlords: number
  }
  commissionByMonth: { month: string; amount: number }[]
  registrationsByMonth: { month: string; count: number }[]
  recentPayments: Array<{
    _id: string
    amount: number
    method: string
    status: string
    paidAt?: string
    studentId?: { name: string }
    roomId?: { title: string }
  }>
}

export default function ReportsPage() {
  useRoleGuard(["admin"])
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState("30d")

  useEffect(() => {
    fetchReports(range)
  }, [range])

  async function fetchReports(days: string) {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/reports?range=${days}`)
      if (res.ok) setData(await res.json())
    } catch {} finally {
      setLoading(false)
    }
  }

  const rangeFilters = [
    { label: "7 Days", value: "7d" },
    { label: "30 Days", value: "30d" },
    { label: "90 Days", value: "90d" },
    { label: "All", value: "all" },
  ]

  function toCsvRow(row: string[]) {
    return row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")
  }

  function handleExport() {
    if (!data?.recentPayments?.length) {
      toast.info("No payment data to export")
      return
    }
    const headers = ["Student", "Room", "Amount", "Method", "Status", "Date"]
    const rows = data.recentPayments.map((p) => [
      p.studentId?.name || "Unknown",
      p.roomId?.title || "N/A",
      String(p.amount),
      p.method,
      p.status,
      p.paidAt ? new Date(p.paidAt).toLocaleDateString() : "N/A",
    ])
    const csv = [toCsvRow(headers), ...rows.map(toCsvRow)].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `payments-export-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Failed to load reports</p>
      </div>
    )
  }

  const summaryCards = [
    { label: "Total Commission", value: formatPrice(data.summary.totalCommission), icon: IndianRupee },
    { label: "Total Students", value: data.summary.totalStudents, icon: Users },
    { label: "Total Rooms", value: data.summary.totalRooms, icon: Building2 },
    { label: "Total Landlords", value: data.summary.totalLandlords, icon: UserCheck },
  ]

  const maxCommission = Math.max(...data.commissionByMonth.map((m) => m.amount), 1)
  const maxRegistrations = Math.max(...data.registrationsByMonth.map((m) => m.count), 1)

  return (
    <div className="mx-auto max-w-6xl space-y-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="text-muted-foreground">Platform analytics and statistics</p>
        </div>
        <Button variant="outline" onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </div>

      <div className="flex gap-2">
        {rangeFilters.map((f) => (
          <Button
            key={f.value}
            variant={range === f.value ? "default" : "outline"}
            size="sm"
            onClick={() => setRange(f.value)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((s) => {
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

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Commission by Month</CardTitle>
          </CardHeader>
          <CardContent>
            {data.commissionByMonth.length === 0 ? (
              <p className="text-muted-foreground py-8 text-center">No data</p>
            ) : (
              <div className="space-y-2">
                {data.commissionByMonth.map((m) => (
                  <div key={m.month} className="flex items-center gap-3">
                    <span className="w-20 text-sm text-muted-foreground">{m.month}</span>
                    <div className="flex-1 h-6 rounded bg-secondary overflow-hidden">
                      <div
                        className="h-full rounded bg-primary transition-all"
                        style={{ width: `${(m.amount / maxCommission) * 100}%` }}
                      />
                    </div>
                    <span className="w-24 text-right text-sm font-medium">{formatPrice(m.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>New Registrations by Month</CardTitle>
          </CardHeader>
          <CardContent>
            {data.registrationsByMonth.length === 0 ? (
              <p className="text-muted-foreground py-8 text-center">No data</p>
            ) : (
              <div className="space-y-2">
                {data.registrationsByMonth.map((m) => (
                  <div key={m.month} className="flex items-center gap-3">
                    <span className="w-20 text-sm text-muted-foreground">{m.month}</span>
                    <div className="flex-1 h-6 rounded bg-secondary overflow-hidden">
                      <div
                        className="h-full rounded bg-accent transition-all"
                        style={{ width: `${(m.count / maxRegistrations) * 100}%` }}
                      />
                    </div>
                    <span className="w-16 text-right text-sm font-medium">{m.count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Payments</CardTitle>
          <CardDescription>Latest payment transactions</CardDescription>
        </CardHeader>
        <CardContent>
          {data.recentPayments.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">No payments yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium">Student</th>
                    <th className="pb-2 font-medium">Room</th>
                    <th className="pb-2 font-medium">Amount</th>
                    <th className="pb-2 font-medium">Method</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.recentPayments.map((p) => (
                    <tr key={p._id} className="hover:bg-secondary/50">
                      <td className="py-2 pr-4">{p.studentId?.name || "Unknown"}</td>
                      <td className="py-2 pr-4 text-muted-foreground">{p.roomId?.title || "N/A"}</td>
                      <td className="py-2 pr-4">{formatPrice(p.amount)}</td>
                      <td className="py-2 pr-4 capitalize">{p.method}</td>
                      <td className="py-2 pr-4 capitalize">{p.status}</td>
                      <td className="py-2 text-muted-foreground">
                        {p.paidAt ? new Date(p.paidAt).toLocaleDateString() : "N/A"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
