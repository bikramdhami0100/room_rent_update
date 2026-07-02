"use client"

import { useState } from "react"
import Link from "next/link"
import { toast } from "react-toastify"
import { Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch("/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (res.ok) {
        setSent(true)
        toast.success("If the email exists, a reset link has been sent")
      } else {
        toast.error(data.error || "Failed to send reset link")
      }
    } catch {
      toast.error("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-sm items-center justify-center px-4">
      <div className="w-full text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <Lock className="h-7 w-7 text-primary" />
        </div>
        <h1 className="mt-6 text-3xl font-bold">Reset Password</h1>
        <p className="mt-2 text-muted-foreground">
          Enter your email and we&apos;ll send you a reset link
        </p>
        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <Input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={sent}
          />
          {sent ? (
            <p className="text-sm text-muted-foreground">Check your email for the reset link</p>
          ) : (
            <Button type="submit" className="w-full" loading={loading}>
              Send Reset Link
            </Button>
          )}
        </form>
        <p className="mt-6 text-sm text-muted-foreground">
          Remember your password?{" "}
          <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
