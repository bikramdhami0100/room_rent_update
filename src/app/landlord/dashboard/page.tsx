"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Home, CheckCircle, Users, PlusCircle, FileText, CreditCard, ShieldCheck, Clock, AlertTriangle } from "lucide-react"
import { toast } from "react-toastify"
import { useRoleGuard } from "@/hooks/useRoleGuard"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"

interface DashboardData {
  totalListings: number
  activeListings: number
  totalConfirmations: number
  recentConfirmations: Array<{
    _id: string
    studentId: { name: string; email: string }
    roomId: { title: string }
    confirmedAt: string
  }>
}

interface DocInfo {
  status: string
  submittedAt: string | null
  adminComment?: string
}

export default function DashboardPage() {
  useRoleGuard(["landlord"])
  const [data, setData] = useState<DashboardData | null>(null)
  const [verification, setVerification] = useState<DocInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([fetchDashboard(), fetchVerification()]).finally(() => setLoading(false))
  }, [])

  async function fetchDashboard() {
    try {
      const res = await fetch("/api/landlord/dashboard")
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
    } catch {
      // silent
    }
  }

  async function fetchVerification() {
    try {
      const res = await fetch("/api/landlord/documents")
      if (res.ok) {
        const docs = await res.json()
        if (docs.length > 0) {
          const allApproved = docs.every((d: DocInfo) => d.status === "approved")
          const anyRejected = docs.some((d: DocInfo) => d.status === "rejected")
          const allSubmitted = docs.some((d: DocInfo) => d.submittedAt)
          const hasPending = docs.some((d: DocInfo) => d.status === "pending")
          setVerification({
            status: allApproved ? "approved" : anyRejected ? "rejected" : allSubmitted ? "submitted" : "pending",
            submittedAt: null,
            adminComment: docs.find((d: DocInfo) => d.adminComment)?.adminComment,
          })
        }
      }
    } catch {
      // silent
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    )
  }

  const stats = [
    { label: "Total Listings", value: data?.totalListings ?? 0, icon: Home },
    { label: "Active", value: data?.activeListings ?? 0, icon: CheckCircle },
    { label: "Confirmations", value: data?.totalConfirmations ?? 0, icon: Users },
  ]

  const quickActions = [
    { label: "New Listing", href: "/landlord/listings/new", icon: PlusCircle },
    { label: "My Listings", href: "/landlord/listings", icon: FileText },
    { label: "Payments", href: "/landlord/payments", icon: CreditCard },
  ]

  return (
    <div className="mx-auto max-w-5xl space-y-6 py-10">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your landlord account</p>
      </div>

      {verification && (
        <Card>
          <CardContent className="p-4">
            {verification.status === "approved" ? (
              <div className="flex items-center gap-3 text-green-600">
                <ShieldCheck className="h-6 w-6" />
                <p className="font-semibold">Account Verified — You can list rooms</p>
              </div>
            ) : verification.status === "rejected" ? (
              <div className="flex items-center gap-3 text-red-600">
                <AlertTriangle className="h-6 w-6" />
                <div>
                  <p className="font-semibold">Document Rejected</p>
                  {verification.adminComment && <p className="text-sm">{verification.adminComment}</p>}
                </div>
              </div>
            ) : verification.status === "submitted" ? (
              <div className="flex items-center gap-3 text-yellow-600">
                <Clock className="h-6 w-6" />
                <p className="font-semibold">Documents Under Review — Please wait for admin verification (24-48 hours)</p>
              </div>
            ) : (
              <Link href="/landlord/documents" className="flex items-center gap-3 text-muted-foreground hover:text-foreground">
                <AlertTriangle className="h-6 w-6" />
                <p className="font-semibold">Upload Required Documents to Start Listing Rooms</p>
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      {!verification && (
        <Link href="/landlord/documents">
          <Card className="cursor-pointer hover:bg-muted/50">
            <CardContent className="flex items-center gap-3 p-4 text-muted-foreground">
              <AlertTriangle className="h-6 w-6" />
              <p className="font-semibold">Upload Required Documents to Start Listing Rooms</p>
            </CardContent>
          </Card>
        </Link>
      )}

      {data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {stats.map((stat) => {
              const Icon = stat.icon
              return (
                <Card key={stat.label}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              {quickActions.map((action) => {
                const Icon = action.icon
                return (
                  <Link key={action.href} href={action.href}>
                    <Button variant="outline">
                      <Icon className="mr-2 h-4 w-4" />
                      {action.label}
                    </Button>
                  </Link>
                )
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Confirmations</CardTitle>
              <CardDescription>Latest booking confirmations</CardDescription>
            </CardHeader>
            <CardContent>
              {data.recentConfirmations.length === 0 ? (
                <p className="text-muted-foreground">No confirmations yet</p>
              ) : (
                <div className="space-y-3">
                  {data.recentConfirmations.map((c) => (
                    <div
                      key={c._id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div>
                        <p className="font-medium">{c.roomId?.title || "Unknown Room"}</p>
                        <p className="text-sm text-muted-foreground">
                          Student: {c.studentId?.name || "Unknown"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">
                          {new Date(c.confirmedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <p className="text-center text-muted-foreground">Failed to load dashboard data</p>
      )}
    </div>
  )
}
