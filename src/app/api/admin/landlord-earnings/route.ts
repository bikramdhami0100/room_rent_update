import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { connectDB } from "@/lib/db/connect"
import User from "@/lib/db/models/User"
import LandlordEarning from "@/lib/db/models/LandlordEarning"
import LandlordPayout from "@/lib/db/models/LandlordPayout"

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req: req as any, secret: process.env.AUTH_SECRET })
    if (!token || token.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    // 1. Get all landlords who have set payout details
    const landlordsWithPayout = await User.find({
      role: "landlord",
      $or: [
        { payoutMethod: { $exists: true, $ne: null, $ne: "" } },
        { payoutAccountName: { $exists: true, $ne: null, $ne: "" } },
      ],
    })
      .select("name email phone payoutMethod payoutAccountName payoutAccountNumber payoutBankName payoutQrCode payoutFrequency")
      .sort({ name: 1 })
      .lean()

    // 2. Get all earnings
    const earnings = await LandlordEarning.find({})
      .populate("landlordId", "name email phone payoutMethod payoutAccountName payoutAccountNumber payoutBankName payoutFrequency")
      .populate("paymentId", "amount method createdAt")
      .sort({ createdAt: -1 })
      .lean()

    // 3. Group earnings by landlord
    const earningMap: Record<string, {
      totalPending: number
      totalPaid: number
      earnings: unknown[]
    }> = {}

    for (const e of earnings) {
      const lid = (e.landlordId as any)._id.toString()
      if (!earningMap[lid]) {
        earningMap[lid] = { totalPending: 0, totalPaid: 0, earnings: [] }
      }
      if (e.status === "pending") earningMap[lid].totalPending += e.landlordShare
      else earningMap[lid].totalPaid += e.landlordShare
      earningMap[lid].earnings.push(e)
    }

    // 4. Get all payouts for next-due calculation
    const payouts = await LandlordPayout.find({})
      .populate("landlordId", "name email")
      .sort({ createdAt: -1 })
      .lean()

    // 5. Build latest payout date per landlord
    const latestPayoutDateMap: Record<string, Date> = {}
    const firstEarningDateMap: Record<string, Date> = {}
    for (const p of payouts) {
      const lid = (p.landlordId as any)._id?.toString() || p.landlordId.toString()
      if (!latestPayoutDateMap[lid] && p.paidAt) latestPayoutDateMap[lid] = p.paidAt
    }
    for (const e of earnings) {
      const lid = (e.landlordId as any)._id.toString()
      if (!firstEarningDateMap[lid] || e.createdAt < firstEarningDateMap[lid]) {
        firstEarningDateMap[lid] = e.createdAt
      }
    }

    const FREQUENCY_DAYS: Record<string, number> = {
      weekly: 7, monthly: 30, thrice_monthly: 10, half_yearly: 180, yearly: 365,
    }

    function calcNextPayout(freq: string | undefined, lastDate: Date | undefined): string | null {
      if (!freq || !FREQUENCY_DAYS[freq]) return null
      const base = lastDate || new Date()
      const next = new Date(base.getTime() + FREQUENCY_DAYS[freq] * 24 * 60 * 60 * 1000)
      return next.toISOString()
    }

    function calcPayoutStatus(nextPayout: string | null, totalPending: number): string {
      if (!nextPayout || totalPending === 0) return "no_data"
      const diff = new Date(nextPayout).getTime() - Date.now()
      const daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24))
      if (daysLeft < 0) return "overdue"
      if (daysLeft <= 3) return "due_soon"
      if (daysLeft <= 7) return "upcoming"
      return "normal"
    }

    // 6. Merge: all landlords with payout details + any landlord with earnings
    const mergedMap: Record<string, {
      landlord: unknown
      totalPending: number
      totalPaid: number
      earnings: unknown[]
      nextPayoutDate: string | null
      payoutStatus: string
    }> = {}

    // Add landlords with payout details
    for (const l of landlordsWithPayout) {
      const lid = l._id.toString()
      const freq = (l as any).payoutFrequency
      const lastPayout = latestPayoutDateMap[lid] || firstEarningDateMap[lid]
      const nextDate = calcNextPayout(freq, lastPayout)
      const pending = earningMap[lid]?.totalPending || 0
      mergedMap[lid] = {
        landlord: l,
        totalPending: pending,
        totalPaid: earningMap[lid]?.totalPaid || 0,
        earnings: earningMap[lid]?.earnings || [],
        nextPayoutDate: nextDate,
        payoutStatus: calcPayoutStatus(nextDate, pending),
      }
    }

    // Add any landlord who has earnings but no payout details
    for (const [lid, data] of Object.entries(earningMap)) {
      if (!mergedMap[lid]) {
        const earningLandlord = earnings.find((e) => (e.landlordId as any)._id.toString() === lid)?.landlordId
        if (earningLandlord) {
          const freq = ((earningLandlord as any) as { payoutFrequency?: string }).payoutFrequency
          const lastPayout = latestPayoutDateMap[lid] || firstEarningDateMap[lid]
          const nextDate = calcNextPayout(freq, lastPayout)
          mergedMap[lid] = {
            landlord: earningLandlord,
            totalPending: data.totalPending,
            totalPaid: data.totalPaid,
            earnings: data.earnings,
            nextPayoutDate: nextDate,
            payoutStatus: calcPayoutStatus(nextDate, data.totalPending),
          }
        }
      }
    }

    const totalAllPending = Object.values(mergedMap).reduce((s, g) => s + g.totalPending, 0)

    return NextResponse.json({
      earnings,
      groupedByLandlord: Object.values(mergedMap),
      payouts,
      totalAllPending,
      counts: {
        landlordsWithPayout: landlordsWithPayout.length,
        landlordsWithEarnings: Object.keys(earningMap).length,
      },
    })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
