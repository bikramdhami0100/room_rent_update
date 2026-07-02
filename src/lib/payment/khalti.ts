const KHALTI_SECRET = process.env.KHALTI_SECRET_KEY || ""
const KHALTI_INITIATE_URL = process.env.KHALTI_INITIATE_URL || "https://dev.khalti.com/api/v2/epayment/initiate/"
const KHALTI_LOOKUP_URL = process.env.KHALTI_LOOKUP_URL || "https://dev.khalti.com/api/v2/epayment/lookup/"

interface KhaltiInitiateResponse {
  pidx: string
  payment_url: string
  expires_at: string
  expires_in: number
  total_amount: number
  status: string
}

interface KhaltiLookupResponse {
  pidx: string
  total_amount: number
  status: "Completed" | "Pending" | "Initiated" | "Refunded" | "Expired" | "User canceled"
  transaction_id: string
}

export async function initiateKhaltiPayment(params: {
  amount: number
  purchaseOrderId: string
  purchaseOrderName: string
  returnUrl: string
  websiteUrl: string
  customerInfo: { name: string; email: string; phone: string }
}): Promise<KhaltiInitiateResponse> {
  const res = await fetch(KHALTI_INITIATE_URL, {
    method: "POST",
    headers: {
      Authorization: `Key ${KHALTI_SECRET}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      return_url: params.returnUrl,
      website_url: params.websiteUrl,
      amount: Math.round(params.amount * 100),
      purchase_order_id: params.purchaseOrderId,
      purchase_order_name: params.purchaseOrderName,
      customer_info: params.customerInfo,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Khalti initiation failed" }))
    throw new Error(err.error || `Khalti error: ${res.status}`)
  }

  return res.json()
}

export async function lookupKhaltiPayment(pidx: string): Promise<KhaltiLookupResponse> {
  const res = await fetch(KHALTI_LOOKUP_URL, {
    method: "POST",
    headers: {
      Authorization: `Key ${KHALTI_SECRET}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ pidx }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Khalti lookup failed" }))
    throw new Error(err.error || `Khalti lookup error: ${res.status}`)
  }

  return res.json()
}
