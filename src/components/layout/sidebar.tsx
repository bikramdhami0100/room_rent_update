"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  ShieldCheck,
  Building2,
  Users,
  QrCode,
  BarChart3,
  FileText,
  PlusCircle,
  CreditCard,
  Landmark,
  HandCoins,
  Settings,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

type Role = "admin" | "landlord"

type NavLink = { href: string; label: string; icon: React.ComponentType<{ className?: string }> }
type NavDivider = { divider: true; label: string }

interface SidebarProps {
  role: Role
}

const adminLinks: (NavLink | NavDivider)[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/verify", label: "Verify Landlords", icon: ShieldCheck },
  { href: "/admin/listings", label: "Manage Listings", icon: Building2 },
  { href: "/admin/students", label: "Manage Students", icon: Users },
  { href: "/admin/qrcode", label: "QR Code", icon: QrCode },
  { href: "/admin/reports", label: "Reports", icon: BarChart3 },
  { divider: true, label: "System Config" },
  { href: "/admin/system-config/esewa", label: "eSewa", icon: CreditCard },
  { href: "/admin/system-config/khalti", label: "Khalti", icon: CreditCard },
  { href: "/admin/system-config/bank-details", label: "Bank Details", icon: Landmark },
  { href: "/admin/system-config/direct-payment", label: "Direct Payment", icon: HandCoins },
]

const landlordLinks: NavLink[] = [
  { href: "/landlord/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/landlord/documents", label: "My Documents", icon: FileText },
  { href: "/landlord/listings", label: "My Listings", icon: Building2 },
  { href: "/landlord/listings/new", label: "Add Listing", icon: PlusCircle },
  { href: "/landlord/payments", label: "Payments", icon: CreditCard },
]

export function Sidebar({ role }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const links = role === "admin" ? adminLinks : landlordLinks

  function renderNavItem(link: NavLink | NavDivider, isMobile: boolean) {
    if ("divider" in link) {
      if (collapsed) return null
      return (
        <div key={link.label} className="pt-4 pb-1">
          <div className="flex items-center gap-2 px-3">
            <Settings className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{link.label}</span>
          </div>
        </div>
      )
    }
    return (
      <Link
        key={link.href}
        href={link.href}
        onClick={isMobile ? () => setCollapsed(true) : undefined}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-secondary hover:text-secondary-foreground",
          pathname === link.href
            ? "bg-secondary text-secondary-foreground"
            : "text-muted-foreground",
          collapsed && "justify-center px-2"
        )}
      >
        <link.icon className="h-5 w-5 shrink-0" />
        {!collapsed && <span>{link.label}</span>}
      </Link>
    )
  }

  return (
    <>
      <aside
        className={cn(
          "fixed left-0 top-16 z-40 hidden h-[calc(100vh-4rem)] flex-col border-r bg-background transition-all duration-300 md:flex",
          collapsed ? "w-16" : "w-64"
        )}
      >
        <div className="flex items-center justify-end p-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? (
              <PanelLeft className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </Button>
        </div>
        <nav className="flex-1 space-y-1 px-2 pb-4">
          {links.map((link) => renderNavItem(link as NavLink | NavDivider, false))}
        </nav>
      </aside>

      <div className="md:hidden">
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-64 border-r bg-background transition-transform duration-300",
            collapsed ? "-translate-x-full" : "translate-x-0"
          )}
        >
          <div className="flex items-center justify-end p-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(true)}
            >
              <PanelLeftClose className="h-4 w-4" />
            </Button>
          </div>
          <nav className="space-y-1 px-2 pb-4">
            {links.map((link) => renderNavItem(link as NavLink | NavDivider, true))}
          </nav>
        </aside>

        {!collapsed && (
          <div
            className="fixed inset-0 z-40 bg-black/50"
            onClick={() => setCollapsed(true)}
          />
        )}
      </div>
    </>
  )
}
