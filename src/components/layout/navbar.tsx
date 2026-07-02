"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { Menu, X, Home, Search, LayoutDashboard, ShieldCheck, User, BookOpen } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { LocaleSwitcher } from "@/components/ui/locale-switcher"
import { useLocale } from "@/components/ui/locale-provider"
import { useT } from "@/hooks/useT"
import { useAuth } from "@/components/auth/auth-provider"

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()
  const { user: authUser, role: userRole, isAuthenticated } = useAuth()
  const { locale } = useLocale()
  const { t } = useT()

  const navLinks = [
    { href: "/", label: t("nav.home"), icon: Home },
    { href: "/search", label: t("nav.search"), icon: Search },
  ]

  const dashboardHref =
    userRole === "admin" ? "/admin/dashboard"
    : userRole === "landlord" ? "/landlord/dashboard"
    : userRole === "student" ? "/student/dashboard"
    : null

  const dashboardLabel =
    userRole === "admin" ? t("nav.dashboard")
    : userRole === "landlord" ? t("nav.dashboard")
    : userRole === "student" ? t("nav.dashboard")
    : null

  const dashboardIcon =
    userRole === "admin" ? ShieldCheck
    : userRole === "landlord" ? LayoutDashboard
    : userRole === "student" ? BookOpen
    : null

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-xl font-bold text-primary">
            RoomRent
          </Link>
          <nav className="hidden md:flex md:items-center md:gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-secondary hover:text-secondary-foreground",
                  pathname === link.href
                    ? "bg-secondary text-secondary-foreground"
                    : "text-muted-foreground"
                )}
              >
                <link.icon className="h-4 w-4" />
                {link.label}
              </Link>
            ))}
            {dashboardHref && dashboardIcon && (() => { const Icon = dashboardIcon; return (
              <Link
                href={dashboardHref}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-secondary hover:text-secondary-foreground",
                  pathname === dashboardHref
                    ? "bg-secondary text-secondary-foreground"
                    : "text-muted-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {dashboardLabel}
              </Link>
            )})()}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <LocaleSwitcher locale={locale} onChange={() => {}} />
          <ThemeToggle />
          <div className="hidden md:flex md:items-center md:gap-2">
            {isAuthenticated ? (
              <>
                <Link href="/profile" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {authUser?.name}
                </Link>
                <Button variant="ghost" size="sm" onClick={() => signOut()}>
                  {t("nav.logout")}
                </Button>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm">
                    {t("nav.login")}
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="sm">{t("nav.register")}</Button>
                </Link>
              </>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t md:hidden">
          <div className="space-y-1 px-4 pb-4 pt-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-secondary hover:text-secondary-foreground",
                  pathname === link.href
                    ? "bg-secondary text-secondary-foreground"
                    : "text-muted-foreground"
                )}
              >
                <link.icon className="h-4 w-4" />
                {link.label}
              </Link>
            ))}
            {dashboardHref && dashboardIcon && (() => { const Icon = dashboardIcon; return (
              <Link
                href={dashboardHref}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-secondary hover:text-secondary-foreground",
                  pathname === dashboardHref
                    ? "bg-secondary text-secondary-foreground"
                    : "text-muted-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {dashboardLabel}
              </Link>
            )})()}
            <hr className="my-2" />
            {isAuthenticated ? (
              <div className="space-y-1">
                <Link href="/profile" className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-secondary transition-colors">
                  <User className="h-4 w-4" />
                  {authUser?.name}
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => signOut()}
                >
                  {t("nav.logout")}
                </Button>
              </div>
            ) : (
              <div className="space-y-1">
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary"
                >
                  {t("nav.login")}
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary"
                >
                  {t("nav.register")}
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
