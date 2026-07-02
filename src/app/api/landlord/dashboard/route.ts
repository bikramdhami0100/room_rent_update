import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { connectDB } from "@/lib/db/connect"
import Room from "@/lib/db/models/Room"
import Confirmation from "@/lib/db/models/Confirmation"
import mongoose from "mongoose"

export async function GET(_req: NextRequest) {
  try {
    const token = await getToken({ req: _req as any, secret: process.env.AUTH_SECRET })
    console.log("Token:", token)
    if (!token || token.role !== "landlord") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const landlordId = new mongoose.Types.ObjectId(token.id as string)

    const totalListings = await Room.countDocuments({ landlordId })
    const activeListings = await Room.countDocuments({ landlordId, isActive: true })
    const totalConfirmations = await Confirmation.countDocuments({ landlordId })

    const commissionResult = await Confirmation.aggregate([
      { $match: { landlordId } },
      { $group: { _id: null, total: { $sum: "$commission" } } },
    ])
    // console.log("Commission Result:", commissionResult)
    const totalCommission = commissionResult.length > 0 ? commissionResult[0].total : 0

    const recentConfirmations = await Confirmation.find({ landlordId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("studentId roomId")
      .lean()

    let data={
      totalListings,
      activeListings,
      totalCommission,
      totalConfirmations,
      recentConfirmations,
    }
    // console.log("Dashboard Data:", data)
    return NextResponse.json(data, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
