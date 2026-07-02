import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db/connect"
import Payment from "@/lib/db/models/Payment"
import Room from "@/lib/db/models/Room"
import User from "@/lib/db/models/User"
import LandlordDocument from "@/lib/db/models/LandlordDocument"
import { getToken } from "next-auth/jwt"

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req: req as any, secret: process.env.AUTH_SECRET })
    if (!token || token.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const totalCommissionResult = await Payment.aggregate([
      { $match: { status: "paid" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ])
    const totalCommission = totalCommissionResult[0]?.total || 0

    const activeRooms = await Room.countDocuments({ isActive: true, isApproved: true })

    const activeStudents = await User.countDocuments({ role: "student", isSuspended: false })

    const landlordIdsWithApprovedRooms = await Room.distinct("landlordId", {
      isApproved: true,
    })
    const activeLandlords = landlordIdsWithApprovedRooms.length

    const pendingDocs = await LandlordDocument.distinct("userId", { status: "pending" })
    const pendingVerifications = pendingDocs.length
    return NextResponse.json({
      totalCommission,
      activeRooms,
      activeStudents,
      activeLandlords,
      pendingVerifications,
    }, { status: 200 })
  } catch (error) {
    console.error("Stats API error:", error)
    const message = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
