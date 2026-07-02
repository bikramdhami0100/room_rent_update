"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "react-toastify"
import { TriangleAlert, Smartphone, CreditCard, QrCode, Building2, Loader2, CheckCircle2, Upload } from "lucide-react"
import { useT } from "@/hooks/useT"
import { Button } from "@/components/ui/button"
import { Modal } from "@/components/ui/modal"
import { formatPrice } from "@/lib/utils"

const ESEWA_FORM_ACTION = "https://rc-epay.esewa.com.np/api/epay/main/v2/form"

interface SuspensionData {
  commissionDue: number
  message: string
}

interface BankDetail {
  _id: string
  bankName: string
  accountHolderName: string
  accountNumber: string
  branch: string
  qrCodeImage: string
  isActive: boolean
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
  const [bankDetails, setBankDetails] = useState<BankDetail[]>([])
  const [showBankModal, setShowBankModal] = useState(false)
  const [selectedBank, setSelectedBank] = useState<BankDetail | null>(null)
  const [bankScreenshot, setBankScreenshot] = useState<File | null>(null)
  const [bankScreenshotPreview, setBankScreenshotPreview] = useState("")
  const [uploadingBank, setUploadingBank] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch("/api/suspension").then((res) => res.json()),
      fetch("/api/bank-details").then(r => r.ok ? r.json() : []),
    ])
      .then(([data, banks]) => {
        setSuspension(data)
        setBankDetails(banks)
      })
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

  function handleBankScreenshotChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setBankScreenshot(file)
    setBankScreenshotPreview(URL.createObjectURL(file))
  }

  async function handleBankSubmit() {
    if (!selectedBank) return
    if (!bankScreenshot) {
      toast.error("Please upload a payment screenshot or statement")
      return
    }
    setUploadingBank(true)
    try {
      const formData = new FormData()
      formData.append("file", bankScreenshot)

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })
      if (!uploadRes.ok) throw new Error("Screenshot upload failed")
      const { url } = await uploadRes.json()

      const res = await fetch("/api/suspension", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: "bank",
          bankId: selectedBank._id,
          screenshotUrl: url,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Bank payment submission failed")
      }

      toast.success("Payment proof submitted! Admin will verify shortly.")
      setShowBankModal(false)
      router.push("/")
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to submit payment proof")
    } finally {
      setUploadingBank(false)
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

        {bankDetails.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-xs font-medium text-muted-foreground text-left">Bank Transfer</p>
            {bankDetails.map((bank) => (
              <button
                key={bank._id}
                onClick={() => { setSelectedBank(bank); setShowBankModal(true) }}
                className="flex w-full items-center gap-4 rounded-lg border border-border p-4 text-left transition-colors hover:bg-muted"
              >
                <Building2 className="h-6 w-6 text-primary" />
                <div className="min-w-0">
                  <p className="font-medium">{bank.bankName}</p>
                  <p className="text-xs text-muted-foreground truncate">{bank.accountHolderName} - {bank.accountNumber}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        <Button size="lg" className="mt-8 w-full" loading={paying} onClick={handlePayAndReactivate}>
          {paying ? "Initiating..." : t("suspension.reactivate")}
        </Button>
      </div>

      <Modal isOpen={showQrModal} onClose={() => { setShowQrModal(false); setPaying(false) }} title="Scan QR Code to Pay">
        <div className="flex flex-col items-center gap-5 py-4">
          <div className="text-center">
            <p className="text-sm font-medium">Scan this QR code with your payment app</p>
            <p className="text-xs text-muted-foreground mt-1">Khalti &middot; eSewa &middot; Any QR Scanner</p>
          </div>

          {qrCodeDataUrl && (
            <div className="rounded-xl border-2 border-primary/20 bg-white p-4 shadow-sm">
              <img src={qrCodeDataUrl} alt="Payment QR Code" className="h-56 w-56" />
            </div>
          )}

          <div className="w-full space-y-2 rounded-lg bg-muted/50 p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-bold text-lg">{suspension ? formatPrice(suspension.commissionDue) : ""}</span>
            </div>
          </div>

          <div className="w-full space-y-1 rounded-lg border border-accent/50 bg-accent/10 p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">Instructions:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Open your Khalti or eSewa app</li>
              <li>Tap the scan icon and scan this QR code</li>
              <li>Enter the exact amount shown above</li>
              <li>Complete the payment</li>
              <li>Click <strong>&quot;I Have Paid&quot;</strong> below</li>
            </ol>
          </div>

          <div className="flex w-full gap-2">
            <Button variant="outline" className="flex-1" onClick={() => { setShowQrModal(false); setPaying(false) }}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleQrPaid}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              I Have Paid
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showBankModal} onClose={() => { setShowBankModal(false); setBankScreenshot(null); setBankScreenshotPreview("") }} title="Bank Transfer Details">
        {selectedBank && (
          <div className="space-y-5 py-4">
            <div className="space-y-3 rounded-lg bg-muted/50 p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Bank</span>
                <span className="font-medium">{selectedBank.bankName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Account Holder</span>
                <span className="font-medium">{selectedBank.accountHolderName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Account Number</span>
                <span className="font-mono font-medium">{selectedBank.accountNumber}</span>
              </div>
              {selectedBank.branch && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Branch</span>
                  <span className="font-medium">{selectedBank.branch}</span>
                </div>
              )}
            </div>

            <div className="rounded-lg bg-muted/50 p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount to Pay</span>
                <span className="font-bold text-lg text-primary">{suspension ? formatPrice(suspension.commissionDue) : ""}</span>
              </div>
            </div>

            {selectedBank.qrCodeImage && (
              <div className="flex flex-col items-center gap-2">
                <p className="text-sm font-medium">Or scan bank QR to pay</p>
                <div className="rounded-xl border-2 bg-white p-3 shadow-sm">
                  <img src={selectedBank.qrCodeImage} alt="Bank QR" className="h-48 w-48 object-contain" />
                </div>
              </div>
            )}

            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
              <p className="text-sm font-semibold">Upload Payment Screenshot / Statement</p>
              <p className="text-xs text-muted-foreground">
                After making the transfer, upload a screenshot or bank statement as proof of payment.
              </p>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-muted-foreground/30 p-4 hover:bg-muted/50 transition-colors">
                <Upload className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-muted-foreground">
                    {bankScreenshot ? bankScreenshot.name : "Tap to upload screenshot"}
                  </p>
                  <p className="text-xs text-muted-foreground/60">JPG, PNG, or PDF (max 5MB)</p>
                </div>
                <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleBankScreenshotChange} />
              </label>
              {bankScreenshotPreview && (
                <div className="rounded-lg border overflow-hidden">
                  <img src={bankScreenshotPreview} alt="Screenshot preview" className="max-h-40 w-full object-contain bg-muted" />
                </div>
              )}
            </div>

            <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-3 text-xs text-yellow-700 dark:text-yellow-400">
              After submitting proof, the admin will verify and mark your payment. It may take up to 24 hours.
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => { setShowBankModal(false); setBankScreenshot(null); setBankScreenshotPreview("") }}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleBankSubmit} loading={uploadingBank} disabled={!bankScreenshot}>
                <Upload className="mr-2 h-4 w-4" />
                Submit Proof
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
