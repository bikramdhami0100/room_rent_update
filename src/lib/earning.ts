import { connectDB } from "@/lib/db/connect"
import LandlordEarning from "@/lib/db/models/LandlordEarning"
import Payment from "@/lib/db/models/Payment"
import { calculateLandlordShare } from "@/lib/utils"

export async function createLandlordEarning(paymentId: string) {
  await connectDB()

  const payment = await Payment.findById(paymentId)
  if (!payment) return

  const existing = await LandlordEarning.findOne({ paymentId })
  if (existing) return

  const landlordShare = calculateLandlordShare(payment.amount)

  await LandlordEarning.create({
    paymentId,
    landlordId: payment.landlordId,
    confirmationId: payment.confirmationId,
    studentCommission: payment.amount,
    landlordShare,
  })
}
