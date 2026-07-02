"use client"

import { Suspense, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { toast } from "react-toastify"
import { Eye, EyeOff, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get("email") || ""
  const token = searchParams.get("token") || ""

  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !token) {
      toast.error("Invalid reset link")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token, password }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success("Password reset successful! Please login.")
        router.push("/login")
      } else {
        toast.error(data.error || "Reset failed")
      }
    } catch {
      toast.error("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  if (!email || !token) {
    return (
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center">
        <p className="text-muted-foreground">Invalid or missing reset link</p>
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-sm items-center justify-center px-4">
      <div className="w-full text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <Lock className="h-7 w-7 text-primary" />
        </div>
        <h1 className="mt-6 text-3xl font-bold">Set New Password</h1>
        <p className="mt-2 text-muted-foreground">Enter your new password</p>
        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <Input
            type={showPassword ? "text" : "password"}
            placeholder="New password (min 6 chars)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            endAdornment={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
          />
          <Button type="submit" className="w-full" loading={loading}>
            Reset Password
          </Button>
        </form>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  )
}
