import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { connectDB } from "@/lib/db/connect"
import LandlordEarning from "@/lib/db/models/LandlordEarning"
import LandlordPayout from "@/lib/db/models/LandlordPayout"
import User from "@/lib/db/models/User"

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req: req as any, secret: process.env.AUTH_SECRET })
    if (!token || token.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { landlordId, note } = body

    if (!landlordId) {
      return NextResponse.json({ error: "landlordId is required" }, { status: 400 })
    }

    await connectDB()

    const pendingEarnings = await LandlordEarning.find({
      landlordId,
      status: "pending",
    })

    if (pendingEarnings.length === 0) {
      return NextResponse.json({ error: "No pending earnings for this landlord" }, { status: 400 })
    }

    const totalAmount = pendingEarnings.reduce((sum, e) => sum + e.landlordShare, 0)

    const landlord = await User.findById(landlordId)
    const frequency = (landlord as any)?.payoutFrequency || "monthly"

    const payout = await LandlordPayout.create({
      landlordId,
      amount: totalAmount,
      frequency,
      status: "paid",
      paidAt: new Date(),
      adminId: token.id,
      note: note || "",
    })

    await LandlordEarning.updateMany(
      { landlordId, status: "pending" },
      { status: "paid", payoutId: payout._id }
    )

    return NextResponse.json({ success: true, payout })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
