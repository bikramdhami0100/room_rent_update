import crypto from "crypto"

const ESEWA_MERCHANT_CODE = process.env.NEXT_PUBLIC_ESEWA_MERCHANT_CODE || ""
const ESEWA_SECRET_KEY = process.env.ESEWA_SECRET_KEY || ""
const ESEWA_PAYMENT_URL = process.env.ESEWA_PAYMENT_URL || "https://rc-epay.esewa.com.np/api/epay/main/v2/form"
const ESEWA_STATUS_URL = process.env.ESEWA_STATUS_URL || "https://rc.esewa.com.np/api/epay/transaction/status/"

export interface EsewaConfig {
  amount: string
  tax_amount: string
  total_amount: string
  transaction_uuid: string
  product_code: string
  product_service_charge: string
  product_delivery_charge: string
  success_url: string
  failure_url: string
  signed_field_names: string
  signature: string
}

function generateSignature(secret: string, message: string): string {
  const hmac = crypto.createHmac("sha256", secret)
  hmac.update(message)
  return hmac.digest("base64")
}

export function buildEsewaConfig(params: {
  amount: number
  transactionUuid: string
  successUrl: string
  failureUrl: string
}): EsewaConfig {
  const totalAmount = String(params.amount)
  const config: EsewaConfig = {
    amount: totalAmount,
    tax_amount: "0",
    total_amount: totalAmount,
    transaction_uuid: params.transactionUuid,
    product_code: ESEWA_MERCHANT_CODE,
    product_service_charge: "0",
    product_delivery_charge: "0",
    success_url: params.successUrl,
    failure_url: params.failureUrl,
    signed_field_names: "total_amount,transaction_uuid,product_code",
    signature: "",
  }

  const signatureString = `total_amount=${config.total_amount},transaction_uuid=${config.transaction_uuid},product_code=${config.product_code}`
  config.signature = generateSignature(ESEWA_SECRET_KEY, signatureString)

  return config
}

interface EsewaDecodedData {
  transaction_uuid: string
  total_amount: string
  product_code: string
  status: string
  [key: string]: unknown
}

export function decodeEsewaData(data: string): EsewaDecodedData {
  const json = Buffer.from(data, "base64").toString("utf-8")
  return JSON.parse(json)
}

interface EsewaStatusResponse {
  status: string
  total_amount: string
  transaction_uuid: string
  product_code: string
}

export async function verifyEsewaPayment(params: {
  productCode: string
  totalAmount: string
  transactionUuid: string
}): Promise<EsewaStatusResponse> {
  const url = `${ESEWA_STATUS_URL}?product_code=${params.productCode}&total_amount=${params.totalAmount}&transaction_uuid=${params.transactionUuid}`
  const res = await fetch(url)

  if (!res.ok) {
    throw new Error(`eSewa verification failed: ${res.status}`)
  }

  return res.json()
}
