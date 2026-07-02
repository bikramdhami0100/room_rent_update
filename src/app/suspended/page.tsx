"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "react-toastify"
import { TriangleAlert, Smartphone, CreditCard, QrCode, Loader2, CheckCircle2 } from "lucide-react"
import { useT } from "@/hooks/useT"
import { Button } from "@/components/ui/button"
import { Modal } from "@/components/ui/modal"
import { formatPrice } from "@/lib/utils"

const ESEWA_FORM_ACTION = "https://rc-epay.esewa.com.np/api/epay/main/v2/form"

interface SuspensionData {
  commissionDue: number
  message: string
}

export default function SuspendedPage() {
  const router = useRouter()
  const [suspension, setSuspension] = useState<SuspensionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [showQrModal, setShowQrModal] = useState(false)
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState("")
  const { t } = useT()
  const paymentMethods = [
    { id: "khalti", name: t("payment.khalti"), icon: Smartphone },
    { id: "esewa", name: t("payment.esewa"), icon: CreditCard },
    { id: "qrcode", name: t("payment.qrCode"), icon: QrCode },
  ]
  const [selectedMethod, setSelectedMethod] = useState("khalti")

  useEffect(() => {
    fetch("/api/suspension")
      .then((res) => res.json())
      .then((data) => setSuspension(data))
      .catch(() => setSuspension(null))
      .finally(() => setLoading(false))
  }, [])

  async function handlePayAndReactivate() {
    setPaying(true)
    try {
      if (selectedMethod === "qrcode") {
        const QRCode = (await import("qrcode")).default
        const qrText = `Payment: Rs.${suspension?.commissionDue || 0}\nType: Commission (Suspension)`
        const dataUrl = await QRCode.toDataURL(qrText, { width: 280, margin: 2 })
        setQrCodeDataUrl(dataUrl)
        setShowQrModal(true)
        return
      }

      const res = await fetch("/api/suspension", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: selectedMethod }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Payment failed")
      }

      const data = await res.json()

      if (selectedMethod === "khalti" && data.paymentUrl) {
        window.location.href = data.paymentUrl
      } else if (selectedMethod === "esewa" && data.esewaConfig) {
        const form = document.createElement("form")
        form.method = "POST"
        form.action = ESEWA_FORM_ACTION
        form.target = "_blank"

        const fields = data.esewaConfig as Record<string, string>
        for (const [key, value] of Object.entries(fields)) {
          const input = document.createElement("input")
          input.type = "hidden"
          input.name = key
          input.value = value
          form.appendChild(input)
        }

        document.body.appendChild(form)
        form.submit()
        document.body.removeChild(form)
      } else if (data.success) {
        toast.success("Payment successful! Your account has been reactivated.")
        router.push("/")
      } else {
        throw new Error("Invalid payment response")
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("common.error"))
    } finally {
      setPaying(false)
    }
  }

  async function handleQrPaid() {
    try {
      const res = await fetch("/api/suspension", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: "qrcode" }),
      })
      if (res.ok) {
        toast.success("Payment submitted! Admin will verify shortly.")
        setShowQrModal(false)
        router.push("/")
      } else {
        toast.error("Please scan and pay before confirming.")
      }
    } catch {
      toast.error("Verification failed")
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12">
      <div className="mx-auto w-full max-w-md text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <TriangleAlert className="h-8 w-8 text-destructive" />
        </div>
        <h1 className="mt-6 text-3xl font-bold">{t("suspension.title")}</h1>
        <p className="mt-3 text-muted-foreground">
          {suspension?.message || "Your account has been suspended due to unpaid commission"}
        </p>
        {suspension && suspension.commissionDue > 0 && (
          <p className="mt-4 text-2xl font-bold text-destructive">
            {formatPrice(suspension.commissionDue)}
          </p>
        )}

        <div className="mt-8 space-y-2">
          {paymentMethods.map((method) => {
            const Icon = method.icon
            return (
              <button
                key={method.id}
                onClick={() => setSelectedMethod(method.id)}
                className={`flex w-full items-center gap-4 rounded-lg border p-4 text-left transition-colors hover:bg-muted ${
                  selectedMethod === method.id ? "border-primary bg-primary/5" : "border-border"
                }`}
              >
                <Icon className="h-6 w-6 text-primary" />
                <span className="font-medium">{method.name}</span>
              </button>
            )
          })}
        </div>

        <Button size="lg" className="mt-8 w-full" loading={paying} onClick={handlePayAndReactivate}>
          {paying ? "Initiating..." : t("suspension.reactivate")}
        </Button>
      </div>

      <Modal isOpen={showQrModal} onClose={() => setShowQrModal(false)} title="Scan QR Code to Pay">
        <div className="flex flex-col items-center gap-4 py-4">
          <p className="text-sm text-muted-foreground">
            Scan this QR code with your Khalti or eSewa app to pay the pending commission.
          </p>
          {qrCodeDataUrl && (
            <img src={qrCodeDataUrl} alt="Payment QR Code" className="rounded-lg border" />
          )}
          {suspension && (
            <p className="text-lg font-bold">{formatPrice(suspension.commissionDue)}</p>
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setShowQrModal(false); setPaying(false) }}>
              Cancel
            </Button>
            <Button onClick={handleQrPaid}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              I Have Paid
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            After scanning and paying, click "I Have Paid" to submit for verification.
          </p>
        </div>
      </Modal>
    </div>
  )
}
