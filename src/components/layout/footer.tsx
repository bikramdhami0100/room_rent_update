"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useT } from "@/hooks/useT"

export function Footer() {
  const pathname = usePathname()
  const { t } = useT()

  if (pathname.startsWith("/admin") || pathname.startsWith("/landlord") || pathname.startsWith("/student")) {
    return null
  }

  const footerLinks = [
    { href: "/", label: t("nav.home") },
    { href: "/search", label: t("nav.search") },
  ]

  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-8 sm:px-6 lg:px-8">
        <nav className="flex gap-6">
          {footerLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <p className="text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} RoomRent. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
