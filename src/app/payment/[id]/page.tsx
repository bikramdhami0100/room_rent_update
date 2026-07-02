"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Wallet, CreditCard, QrCode, Building2, MapPin, Clock, AlertTriangle, Loader2, CheckCircle2, ExternalLink, Upload, HandCoins } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Modal } from "@/components/ui/modal"
import { formatPrice } from "@/lib/utils"
import { toast } from "react-toastify"
import { useT } from "@/hooks/useT"

interface Room {
  _id: string
  title: string
  monthlyRent: number
  location: string
  photos: string[]
}

interface Confirmation {
  _id: string
  roomId: Room
  commission: number
  paymentStatus: "pending" | "paid" | "overdue"
  commissionDeadline?: string
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

interface DirectPaymentConfig {
  _id: string
  title: string
  description: string
  qrCodeImage: string
  isActive: boolean
}

const ESEWA_FORM_ACTION = "https://rc-epay.esewa.com.np/api/epay/main/v2/form"

export default function PaymentPage() {
  const params = useParams()
  const router = useRouter()
  const { t } = useT()
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [selectedMethod, setSelectedMethod] = useState("khalti")
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState("")
  const [showQrModal, setShowQrModal] = useState(false)
  const [qrPaymentId, setQrPaymentId] = useState("")
  const [bankDetails, setBankDetails] = useState<BankDetail[]>([])
  const [showBankModal, setShowBankModal] = useState(false)
  const [selectedBank, setSelectedBank] = useState<BankDetail | null>(null)
  const [bankScreenshot, setBankScreenshot] = useState<File | null>(null)
  const [bankScreenshotPreview, setBankScreenshotPreview] = useState("")
  const [uploadingBank, setUploadingBank] = useState(false)
  const [bankPaymentId, setBankPaymentId] = useState("")
  const [directConfigs, setDirectConfigs] = useState<DirectPaymentConfig[]>([])
  const [showDirectModal, setShowDirectModal] = useState(false)
  const [selectedDirectConfig, setSelectedDirectConfig] = useState<DirectPaymentConfig | null>(null)
  const [directScreenshot, setDirectScreenshot] = useState<File | null>(null)
  const [directScreenshotPreview, setDirectScreenshotPreview] = useState("")
  const [uploadingDirect, setUploadingDirect] = useState(false)
  const [directPaymentId, setDirectPaymentId] = useState("")

  const generateQrCode = useCallback(async (text: string) => {
    const QRCode = (await import("qrcode")).default
    return QRCode.toDataURL(text, { width: 280, margin: 2, color: { dark: "#000000", light: "#ffffff" } })
  }, [])

  const methods = [
    { id: "khalti", name: t("payment.khalti"), icon: Wallet },
    { id: "esewa", name: t("payment.esewa"), icon: CreditCard },
    { id: "qrcode", name: t("payment.qrCode"), icon: QrCode },
    { id: "direct", name: "Direct Payment", icon: HandCoins },
  ]

  const [deadlineCountdown, setDeadlineCountdown] = useState("")

  useEffect(() => {
    Promise.all([
      fetch(`/api/confirm/${params.id}`).then(r => r.ok ? r.json() : Promise.reject()),
      fetch("/api/bank-details").then(r => r.ok ? r.json() : []),
      fetch("/api/direct-payment").then(r => r.ok ? r.json() : []),
    ])
      .then(([conf, banks, directConfigs]) => {
        setConfirmation(conf)
        setBankDetails(banks)
        setDirectConfigs(directConfigs)
      })
      .catch(() => setConfirmation(null))
      .finally(() => setLoading(false))
  }, [params.id])

  useEffect(() => {
    if (!confirmation?.commissionDeadline) return
    function tick() {
      const remaining = new Date(confirmation.commissionDeadline!).getTime() - Date.now()
      if (remaining <= 0) {
        setDeadlineCountdown("EXPIRED")
        return
      }
      const days = Math.floor(remaining / 86400000)
      const hours = Math.floor((remaining % 86400000) / 3600000)
      const minutes = Math.floor((remaining % 3600000) / 60000)
      setDeadlineCountdown(`${days}d ${hours}h ${minutes}m`)
    }
    tick()
    const interval = setInterval(tick, 60000)
    return () => clearInterval(interval)
  }, [confirmation?.commissionDeadline])

  async function handlePay(method?: string) {
    const payMethod = method || selectedMethod
    setPaying(true)
    try {
      if (payMethod === "qrcode") {
        const res = await fetch("/api/payment/initiate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirmationId: params.id, method: payMethod }),
        })

        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || "Payment initiation failed")
        }

        const data = await res.json()
        setQrPaymentId(data.paymentId)

        const qrText = `Payment: Rs.${data.amount}\nRef: ${data.paymentId}\nType: Commission`
        const dataUrl = await generateQrCode(qrText)
        setQrCodeDataUrl(dataUrl)
        setShowQrModal(true)
        return
      }

      if (payMethod === "direct") {
        if (directConfigs.length > 0) {
          setSelectedDirectConfig(null)
          setShowDirectModal(true)
          return
        }
        throw new Error("No direct payment method configured yet")
      }

      const res = await fetch("/api/payment/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmationId: params.id, method: payMethod }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Payment initiation failed")
      }

      const data = await res.json()

      if (payMethod === "khalti" && data.paymentUrl) {
        window.location.href = data.paymentUrl
      } else if (payMethod === "esewa" && data.esewaConfig) {
        const form = document.createElement("form")
        form.method = "POST"
        form.action = ESEWA_FORM_ACTION

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
      const res = await fetch("/api/payment/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: "qrcode", paymentId: qrPaymentId }),
      })
      if (res.ok) {
        toast.success("Payment completed successfully!")
        setShowQrModal(false)
        router.push("/student/dashboard")
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

      const res = await fetch("/api/payment/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirmationId: params.id,
          method: "bank",
          bankId: selectedBank._id,
          screenshotUrl: url,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Bank payment submission failed")
      }

      const data = await res.json()
      setBankPaymentId(data.paymentId)
      toast.success("Payment proof submitted! Admin will verify shortly.")
      setShowBankModal(false)
      router.push("/student/dashboard")
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to submit payment proof")
    } finally {
      setUploadingBank(false)
    }
  }

  function handleDirectScreenshotChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setDirectScreenshot(file)
    setDirectScreenshotPreview(URL.createObjectURL(file))
  }

  async function handleDirectSubmit() {
    if (!directScreenshot) {
      toast.error("Please upload a payment screenshot or statement")
      return
    }
    setUploadingDirect(true)
    try {
      const formData = new FormData()
      formData.append("file", directScreenshot)

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })
      if (!uploadRes.ok) throw new Error("Screenshot upload failed")
      const { url } = await uploadRes.json()

      const res = await fetch("/api/payment/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirmationId: params.id,
          method: "direct",
          screenshotUrl: url,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Direct payment submission failed")
      }

      const data = await res.json()
      setDirectPaymentId(data.paymentId)
      toast.success("Payment proof submitted! Admin will verify shortly.")
      setShowDirectModal(false)
      router.push("/student/dashboard")
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to submit payment proof")
    } finally {
      setUploadingDirect(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!confirmation) {
    return (
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center">
        <p className="text-muted-foreground">{t("common.noData")}</p>
      </div>
    )
  }

  const daysRemaining = confirmation.commissionDeadline
    ? Math.max(0, Math.floor((new Date(confirmation.commissionDeadline).getTime() - Date.now()) / 86400000))
    : 0

  return (
    <div className="mx-auto max-w-lg px-4 py-8 sm:px-6 lg:px-8">
      <Card>
        <CardContent className="p-6 space-y-6">
          <h1 className="text-2xl font-bold">{t("payment.title")}</h1>

          <div className="flex gap-4">
            {confirmation.roomId?.photos?.[0] && (
              <img
                src={confirmation.roomId.photos[0]}
                alt={confirmation.roomId.title}
                className="h-20 w-24 rounded-lg object-cover"
              />
            )}
            <div>
              <h2 className="font-semibold">{confirmation.roomId?.title}</h2>
              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                <MapPin className="h-3.5 w-3.5" />
                {confirmation.roomId?.location}
              </div>
              <p className="text-lg font-bold text-primary mt-1">
                {formatPrice(confirmation.commission)}
              </p>
            </div>
          </div>

          {confirmation.commissionDeadline && (
            <div className={`rounded-lg border p-3 text-sm ${
              deadlineCountdown === "EXPIRED"
                ? "border-red-500/50 bg-red-500/10 text-red-600 dark:text-red-400"
                : "border-yellow-500/50 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"
            }`}>
              <div className="flex items-center gap-2">
                {deadlineCountdown === "EXPIRED" ? (
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                ) : (
                  <Clock className="h-4 w-4 shrink-0" />
                )}
                <span className="font-medium">
                  {deadlineCountdown === "EXPIRED"
                    ? "Payment deadline has passed"
                    : `Payment due in: ${deadlineCountdown}`
                  }
                </span>
              </div>
              <p className="mt-1 text-xs opacity-80">
                Pay within 3 days to avoid losing the booking. You can pay later from your dashboard.
              </p>
            </div>
          )}

          <hr className="border-border" />

          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{t("payment.method")}</p>
            {methods.map((method) => {
              const Icon = method.icon
              return (
                <button
                  key={method.id}
                  onClick={() => {
                    setSelectedMethod(method.id)
                    handlePay(method.id)
                  }}
                  disabled={paying}
                  className={`flex w-full items-center gap-4 rounded-lg border p-4 text-left transition-colors hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed ${
                    selectedMethod === method.id ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <Icon className="h-6 w-6 text-primary" />
                  <span className="font-medium">{method.name}</span>
                  <span className="ml-auto text-sm text-muted-foreground">
                    {paying && selectedMethod === method.id ? "Processing..." : method.id === "khalti" ? "Pay via Khalti" : method.id === "esewa" ? "Pay via eSewa" : "Scan & Pay"}
                  </span>
                </button>
              )
            })}
          </div>

          {bankDetails.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Bank Transfer</p>
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
                  <ExternalLink className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              ))}
            </div>
          )}

          <hr className="border-border" />

          <div className="space-y-3">
            <p className="text-center text-xs text-muted-foreground">
              You have {daysRemaining} day{daysRemaining !== 1 ? "s" : ""} to complete payment.
            </p>
            <Link href="/student/dashboard">
              <Button variant="outline" className="w-full">
                Pay Later — Back to Dashboard
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <Modal isOpen={showQrModal} onClose={() => { setShowQrModal(false); setPaying(false) }} title="Pay via QR Code">
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
              <span className="font-bold text-lg">{confirmation ? formatPrice(confirmation.commission) : ""}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Reference</span>
              <span className="font-mono text-xs">{qrPaymentId.slice(-8).toUpperCase()}</span>
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

      <Modal isOpen={showDirectModal} onClose={() => { setShowDirectModal(false); setDirectScreenshot(null); setDirectScreenshotPreview("") }} title="Direct Payment">
        <div className="space-y-5 py-4">
          {directConfigs.length > 1 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Select payment method</p>
              {directConfigs.map((cfg) => (
                <button
                  key={cfg._id}
                  onClick={() => setSelectedDirectConfig(cfg)}
                  className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted ${
                    selectedDirectConfig?._id === cfg._id ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <HandCoins className="h-5 w-5 text-primary shrink-0" />
                  <div>
                    <p className="font-medium text-sm">{cfg.title}</p>
                    {cfg.description && <p className="text-xs text-muted-foreground">{cfg.description}</p>}
                  </div>
                </button>
              ))}
            </div>
          )}

          {(selectedDirectConfig || directConfigs.length === 1) && (
            <>
              {(() => {
                const config = selectedDirectConfig || directConfigs[0]
                return (
                  <>
                    {directConfigs.length === 1 && (
                      <div>
                        <p className="text-sm font-medium">{config.title}</p>
                        {config.description && <p className="text-xs text-muted-foreground">{config.description}</p>}
                      </div>
                    )}

                    <div className="rounded-lg bg-muted/50 p-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Amount to Pay</span>
                        <span className="font-bold text-lg text-primary">{formatPrice(confirmation.commission)}</span>
                      </div>
                    </div>

                    {config.qrCodeImage && (
                      <div className="flex flex-col items-center gap-2">
                        <p className="text-sm font-medium">Scan this QR code to pay</p>
                        <div className="rounded-xl border-2 bg-white p-3 shadow-sm">
                          <img src={config.qrCodeImage} alt="Payment QR" className="h-48 w-48 object-contain" />
                        </div>
                      </div>
                    )}

                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
                      <p className="text-sm font-semibold">Upload Payment Screenshot / Statement</p>
                      <p className="text-xs text-muted-foreground">
                        After making the payment, upload a screenshot or statement as proof. Admin will verify and confirm your payment.
                      </p>
                      <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-muted-foreground/30 p-4 hover:bg-muted/50 transition-colors">
                        <Upload className="h-5 w-5 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-muted-foreground">
                            {directScreenshot ? directScreenshot.name : "Tap to upload screenshot"}
                          </p>
                          <p className="text-xs text-muted-foreground/60">JPG, PNG, or PDF (max 5MB)</p>
                        </div>
                        <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleDirectScreenshotChange} />
                      </label>
                      {directScreenshotPreview && (
                        <div className="rounded-lg border overflow-hidden">
                          <img src={directScreenshotPreview} alt="Screenshot preview" className="max-h-40 w-full object-contain bg-muted" />
                        </div>
                      )}
                    </div>

                    <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-3 text-xs text-yellow-700 dark:text-yellow-400">
                      After submitting proof, the admin will verify and mark your payment. It may take up to 24 hours.
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1" onClick={() => { setShowDirectModal(false); setDirectScreenshot(null); setDirectScreenshotPreview("") }}>
                        Cancel
                      </Button>
                      <Button className="flex-1" onClick={handleDirectSubmit} loading={uploadingDirect} disabled={!directScreenshot}>
                        <Upload className="mr-2 h-4 w-4" />
                        Submit Proof
                      </Button>
                    </div>
                  </>
                )
              })()}
            </>
          )}
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
                <span className="font-bold text-lg text-primary">{formatPrice(confirmation.commission)}</span>
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
                After making the transfer, upload a screenshot or bank statement as proof of payment. Admin will verify and confirm your payment.
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
