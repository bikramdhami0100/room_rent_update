import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { connectDB } from "@/lib/db/connect"
import Payment from "@/lib/db/models/Payment"

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req: req as any, secret: process.env.AUTH_SECRET })
    if (!token || token.role !== "student") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const confirmationIds = searchParams.get("ids")

    if (!confirmationIds) {
      return NextResponse.json({ payments: [] })
    }

    const ids = confirmationIds.split(",").filter(Boolean)

    await connectDB()

    const payments = await Payment.find({
      confirmationId: { $in: ids },
      studentId: token.id,
      method: "direct",
    })
      .sort({ createdAt: -1 })
      .lean()

    return NextResponse.json({ payments })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
