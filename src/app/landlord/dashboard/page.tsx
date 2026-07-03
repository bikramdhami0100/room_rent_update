"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Home, CheckCircle, Users, PlusCircle, FileText, CreditCard, ShieldCheck, Clock, AlertTriangle, Trash2, Loader2, Building2 } from "lucide-react"
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
  const [deleteTarget, setDeleteTarget] = useState<DashboardData["recentConfirmations"][number] | null>(null)
  const [deleting, setDeleting] = useState(false)

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

  async function handleDeleteConfirmation() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/confirm/${deleteTarget._id}`, { method: "DELETE" })
      if (res.ok) {
        toast.success("Confirmation deleted")
        setData((prev) => prev ? { ...prev, recentConfirmations: prev.recentConfirmations.filter((c) => c._id !== deleteTarget._id) } : prev)
        setDeleteTarget(null)
      } else {
        const err = await res.json().catch(() => ({ error: "Failed to delete" }))
        toast.error(err.error)
      }
    } catch {
      toast.error("Something went wrong")
    } finally {
      setDeleting(false)
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
    { label: "Rentals", href: "/landlord/rentals", icon: Building2 },
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
                      <div className="flex items-center gap-3">
                        <p className="text-xs text-muted-foreground">
                          {new Date(c.confirmedAt).toLocaleDateString()}
                        </p>
                        <button
                          onClick={() => setDeleteTarget(c)}
                          className="rounded p-1 text-muted-foreground transition-colors hover:text-destructive hover:bg-destructive/10"
                          title="Delete confirmation"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
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

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-lg">
            <h3 className="text-lg font-semibold">Delete Confirmation</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Are you sure you want to delete the confirmation for <strong>{deleteTarget.roomId?.title || "Unknown Room"}</strong> by <strong>{deleteTarget.studentId?.name || "Unknown"}</strong>? This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg border border-input bg-transparent px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirmation}
                disabled={deleting}
                className="inline-flex items-center rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-50"
              >
                {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
