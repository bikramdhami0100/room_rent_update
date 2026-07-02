"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { Search } from "lucide-react"
import { formatPrice } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Pagination } from "@/components/ui/pagination"
import { useDataTable, SortIcon } from "@/hooks/useDataTable"

interface Payment {
  _id: string
  roomId: { title: string }
  studentId: { name: string; email: string }
  amount: number
  status: string
  createdAt: string
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)

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

  useEffect(() => {
    fetchPayments()
  }, [fetchPayments])

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

  return (
    <div className="mx-auto max-w-5xl space-y-6 py-10">
      <div>
        <h1 className="text-3xl font-bold">Payments</h1>
        <p className="text-muted-foreground">Commission payments received</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{formatPrice(totalReceived)}</p>
          <p className="text-sm text-muted-foreground">Total received</p>
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-center text-muted-foreground">Loading payments...</p>
      ) : payments.length === 0 && !search ? (
        <p className="text-center text-muted-foreground">No payments yet</p>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Payment History</CardTitle>
            <CardDescription>All commission payments</CardDescription>
          </CardHeader>
          <CardContent>
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
                      Amount <SortIcon sort={sort} column="amount" />
                    </th>
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
          </CardContent>
        </Card>
      )}
    </div>
  )
}
