"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { CheckCircle2, Loader2, XCircle, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Modal } from "@/components/ui/modal"

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying")
  const [message, setMessage] = useState("")
  const [showConfirm, setShowConfirm] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  useEffect(() => {
    const method = searchParams.get("method")
    const paymentId = searchParams.get("paymentId")
    const pidx = searchParams.get("pidx")
    const esewaData = searchParams.get("data")

    if (!method || !paymentId) {
      setStatus("error")
      setMessage("Invalid payment response")
      return
    }

    async function verify() {
      try {
        const res = await fetch("/api/payment/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            method,
            paymentId,
            ...(pidx ? { pidx } : {}),
            ...(esewaData ? { esewaData } : {}),
          }),
        })

        if (res.ok) {
          setStatus("success")
          setMessage("Payment verified successfully!")
          if (!confirmed) {
            setShowConfirm(true)
          }
        } else {
          const err = await res.json()
          setStatus("error")
          setMessage(err.error || "Payment verification failed")
        }
      } catch {
        setStatus("error")
        setMessage("Something went wrong during verification")
      }
    }

    verify()
  }, [searchParams, confirmed])

  function handleConfirm() {
    setConfirmed(true)
    setShowConfirm(false)
  }

  if (status === "verifying") {
    return (
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
          <p className="mt-4 text-lg">Verifying your payment...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center space-y-6">
          {status === "success" ? (
            <>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent/30">
                <CheckCircle2 className="h-10 w-10 text-accent-foreground" />
              </div>
              <h1 className="text-2xl font-bold">Payment Successful!</h1>
              <p className="text-muted-foreground">{message}</p>
              <p className="text-sm text-muted-foreground">
                Your commission has been paid. You can now pay the full rent directly to the landlord.
              </p>
              <Button size="lg" className="w-full" onClick={() => router.push("/student/dashboard")}>
                Go to Dashboard
              </Button>
            </>
          ) : (
            <>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                <XCircle className="h-10 w-10 text-destructive" />
              </div>
              <h1 className="text-2xl font-bold">Payment Failed</h1>
              <p className="text-muted-foreground">{message}</p>
              <Button size="lg" className="w-full" onClick={() => router.back()}>
                Try Again
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Modal isOpen={showConfirm} onClose={() => setShowConfirm(false)} title="Confirm Payment">
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg border border-accent/50 bg-accent/10 p-4">
            <AlertTriangle className="h-5 w-5 text-accent-foreground shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Payment Successful!</p>
              <p>Your payment has been verified and processed successfully. Please confirm to continue.</p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowConfirm(false)}>
              Stay
            </Button>
            <Button onClick={handleConfirm}>
              Confirm
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
