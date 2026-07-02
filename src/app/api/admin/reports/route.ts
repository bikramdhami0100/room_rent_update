import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db/connect"
import Payment from "@/lib/db/models/Payment"
import Room from "@/lib/db/models/Room"
import User from "@/lib/db/models/User"
import { getToken } from "next-auth/jwt"

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req: req as any, secret: process.env.AUTH_SECRET })
    if (!token || token.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const { searchParams } = new URL(req.url)
    const range = searchParams.get("range") || "30d"

    let days: number | null = null
    if (range !== "all") {
      days = parseInt(range.replace("d", ""), 10)
    }

    const dateFilter: Record<string, unknown> = {}
    if (days) {
      const since = new Date()
      since.setDate(since.getDate() - days)
      dateFilter.createdAt = { $gte: since }
    }

    const matchFilter: Record<string, unknown> = { status: "paid" }
    if (days) {
      const since = new Date()
      since.setDate(since.getDate() - days)
      matchFilter.createdAt = { $gte: since }
    }

    const totalCommissionResult = await Payment.aggregate([
      { $match: matchFilter },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ])
    const totalCommission = totalCommissionResult[0]?.total || 0

    const activeRooms = await Room.countDocuments({ isActive: true, isApproved: true })

    const activeStudents = await User.countDocuments({ role: "student", isSuspended: false })

    const landlordIdsWithApprovedRooms = await Room.distinct("landlordId", {
      isApproved: true,
    })
    const activeLandlords = landlordIdsWithApprovedRooms.length

    const recentPayments = await Payment.find(dateFilter)
      .sort({ createdAt: -1 })
      .limit(20)
      .populate("studentId roomId")
      .lean()

    const commissionOverTime = await Payment.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          total: { $sum: "$amount" },
        },
      },
      { $sort: { "_id.year": -1, "_id.month": -1 } },
    ])

    const commissionByMonth = commissionOverTime.map((item) => {
      const date = new Date(item._id.year, item._id.month - 1)
      const month = date.toLocaleString("default", { month: "short", year: "numeric" })
      return { month, amount: item.total }
    })

    const userMatchFilter: Record<string, unknown> = { role: "student" }
    if (days) {
      const since = new Date()
      since.setDate(since.getDate() - days)
      userMatchFilter.createdAt = { $gte: since }
    }

    const registrationsOverTime = await User.aggregate([
      { $match: userMatchFilter },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": -1, "_id.month": -1 } },
    ])

    const registrationsByMonth = registrationsOverTime.map((item) => {
      const date = new Date(item._id.year, item._id.month - 1)
      const month = date.toLocaleString("default", { month: "short", year: "numeric" })
      return { month, count: item.count }
    })

    return NextResponse.json({
      summary: {
        totalCommission,
        totalStudents: activeStudents,
        totalRooms: activeRooms,
        totalLandlords: activeLandlords,
      },
      commissionByMonth,
      registrationsByMonth,
      recentPayments,
    })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
