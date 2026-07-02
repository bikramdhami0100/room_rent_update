"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard, ShieldCheck, List, Users, BarChart3,
  Menu, X, ChevronLeft, CreditCard, Landmark, Settings, Wallet,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useRoleGuard } from "@/hooks/useRoleGuard"
import { Button } from "@/components/ui/button"

type SidebarLink = { href: string; label: string; icon: React.ComponentType<{ className?: string }> }
type SidebarDivider = { divider: true; label: string }

const sidebarLinks: (SidebarLink | SidebarDivider)[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/verify", label: "Verify Landlords", icon: ShieldCheck },
  { href: "/admin/payments", label: "Payments", icon: Wallet },
  { href: "/admin/listings", label: "Manage Listings", icon: List },
  { href: "/admin/students", label: "Students", icon: Users },
  { href: "/admin/reports", label: "Reports", icon: BarChart3 },
  { divider: true, label: "System Config" },
  { href: "/admin/system-config/esewa", label: "eSewa", icon: CreditCard },
  { href: "/admin/system-config/khalti", label: "Khalti", icon: CreditCard },
  { href: "/admin/system-config/bank-details", label: "Bank Details", icon: Landmark },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isLoading } = useRoleGuard(["admin"])
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-background/80 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r bg-card pt-16 transition-transform duration-200 lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <span className="text-sm font-semibold text-muted-foreground">Admin Panel</span>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(false)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {sidebarLinks.map((link) => {
            if ("divider" in link) {
              return (
                <div key={link.label} className="pt-4 pb-1">
                  <div className="flex items-center gap-2 px-3">
                    <Settings className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{link.label}</span>
                  </div>
                </div>
              )
            }
            const Icon = link.icon
            const isActive = pathname === link.href || pathname.startsWith(link.href + "/")
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-secondary",
                  isActive
                    ? "bg-secondary text-secondary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {link.label}
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Mobile toggle */}
      <Button
        variant="outline"
        size="icon"
        className="fixed left-4 top-20 z-[35] lg:hidden"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </Button>

      {/* Main content */}
      <main className="flex-1 px-4 py-6 sm:px-6 lg:ml-64 lg:px-8">
        {children}
      </main>
    </div>
  )
}
