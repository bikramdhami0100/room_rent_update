import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { connectDB } from "@/lib/db/connect"
import LandlordEarning from "@/lib/db/models/LandlordEarning"
import LandlordPayout from "@/lib/db/models/LandlordPayout"

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req: req as any, secret: process.env.AUTH_SECRET })
    if (!token || token.role !== "landlord") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const earnings = await LandlordEarning.find({ landlordId: token.id })
      .populate("paymentId", "method createdAt")
      .sort({ createdAt: -1 })
      .lean()

    const totalEarned = earnings.reduce((sum, e) => sum + e.landlordShare, 0)
    const totalPending = earnings
      .filter((e) => e.status === "pending")
      .reduce((sum, e) => sum + e.landlordShare, 0)
    const totalPaid = earnings
      .filter((e) => e.status === "paid")
      .reduce((sum, e) => sum + e.landlordShare, 0)

    const payouts = await LandlordPayout.find({ landlordId: token.id })
      .sort({ createdAt: -1 })
      .lean()

    return NextResponse.json({
      earnings,
      payouts,
      summary: { totalEarned, totalPending, totalPaid },
    })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
