"use client"

import { createContext, useContext, ReactNode } from "react"
import { useSession } from "next-auth/react"
import type { UserRole } from "@/types"

interface AuthContextType {
  user: {
    id: string
    name: string
    email: string
    role: UserRole
    image?: string | null
  } | null
  role: UserRole | null
  isAuthenticated: boolean
  isLoading: boolean
  session: ReturnType<typeof useSession>["data"]
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  isAuthenticated: false,
  isLoading: true,
  session: null,
})

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession()
  const user = session?.user
    ? {
        id: (session.user as any).id,
        name: session.user.name || "",
        email: session.user.email || "",
        role: (session.user as any).role as UserRole,
        image: session.user.image,
      }
    : null

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role ?? null,
        isAuthenticated: status === "authenticated",
        isLoading: status === "loading",
        session,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
