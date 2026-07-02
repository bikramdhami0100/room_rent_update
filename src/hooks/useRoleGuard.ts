"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { useAuth } from "@/components/auth/auth-provider"

export function useRoleGuard(allowedRoles: string[]) {
  const { role: userRole, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated) {
      router.push("/login")
      return
    }
    if (!userRole || !allowedRoles.includes(userRole)) {
      router.push("/")
    }
  }, [isAuthenticated, isLoading, userRole, allowedRoles, router])

  return { userRole, isLoading }
}
