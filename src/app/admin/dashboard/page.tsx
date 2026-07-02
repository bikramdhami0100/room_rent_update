"use client"

import { useEffect, useState, useRef } from "react"
import Link from "next/link"
import { IndianRupee, Building2, Users, UserCheck, ShieldAlert, ShieldCheck, List, QrCode, BarChart3 } from "lucide-react"
import { formatPrice } from "@/lib/utils"
import { useRoleGuard } from "@/hooks/useRoleGuard"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"

interface AdminStats {
  totalCommission: number
  activeRooms: number
  activeStudents: number
  activeLandlords: number
  pendingVerifications: number
}

interface PendingUser {
  _id: string
  name: string
  email: string
  createdAt: string
}

export default function AdminDashboardPage() {
  const { isLoading: authLoading } = useRoleGuard(["admin"])
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [pending, setPending] = useState<PendingUser[]>([])
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)

  const fetchAllRef = useRef(async () => {
    try {
      await Promise.all([fetchStats(), fetchPending()])
    } finally {
      setLoading(false)
    }
  })

  useEffect(() => {
    fetchAllRef.current()
  }, [])

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        fetchAllRef.current()
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange)
  }, [])

  async function fetchStats() {
    try {
      const res = await fetch("/api/admin/reports/stats")
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }))
        throw new Error(err.error || `HTTP ${res.status}`)
      }
      setStats(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : "Stats fetch failed")
    }
  }

  async function fetchPending() {
    try {
      const res = await fetch("/api/admin/verify")
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }))
        throw new Error(err.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      setPending(data?.landlords || data || [])
    } catch (e) {
      if (!error) setError(e instanceof Error ? e.message : "Pending fetch failed")
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl py-10">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <div className="mt-4 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
          <p className="font-medium">Error loading dashboard</p>
          <p className="mt-1 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">No data available</p>
      </div>
    )
  }

  const statCards = [
    { label: "Total Commission", value: formatPrice(stats.totalCommission), icon: IndianRupee },
    { label: "Active Rooms", value: stats.activeRooms, icon: Building2 },
    { label: "Active Students", value: stats.activeStudents, icon: Users },
    { label: "Active Landlords", value: stats.activeLandlords, icon: UserCheck },
    { label: "Pending Verifications", value: stats.pendingVerifications, icon: ShieldAlert },
  ]

  const quickActions = [
    { label: "Verify Landlords", href: "/admin/verify", icon: ShieldCheck },
    { label: "Manage Listings", href: "/admin/listings", icon: List },
    { label: "QR Code Generator", href: "/admin/qrcode", icon: QrCode },
    { label: "Reports", href: "/admin/reports", icon: BarChart3 },
  ]

  return (
    <div className="mx-auto max-w-5xl space-y-6 py-10">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Overview of the platform</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {statCards.map((s) => {
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

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {quickActions.map((a) => {
            const Icon = a.icon
            return (
              <Link key={a.href} href={a.href}>
                <Button variant="outline">
                  <Icon className="mr-2 h-4 w-4" />
                  {a.label}
                </Button>
              </Link>
            )
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pending Verifications</CardTitle>
          <CardDescription>Landlords waiting for document review</CardDescription>
        </CardHeader>
        <CardContent>
          {pending.length === 0 ? (
            <p className="text-muted-foreground">No pending verifications</p>
          ) : (
            <div className="space-y-3">
              {pending.map((u) => (
                <div key={u._id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium">{u.name}</p>
                    <p className="text-sm text-muted-foreground">{u.email}</p>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
              <Link href="/admin/verify">
                <Button variant="link" className="mt-2">View all</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
