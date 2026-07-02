"use client"

import { ThemeProvider as NextThemesProvider } from "next-themes"
import { SessionProvider } from "next-auth/react"
import { ToastContainer } from "react-toastify"
import { LocaleProvider } from "@/components/ui/locale-provider"
import { AuthProvider } from "@/components/auth/auth-provider"
import "react-toastify/dist/ReactToastify.css"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AuthProvider>
      <NextThemesProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <LocaleProvider>
          {children}
          <ToastContainer
            position="top-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="colored"
          />
        </LocaleProvider>
      </NextThemesProvider>
      </AuthProvider>
    </SessionProvider>
  )
}
