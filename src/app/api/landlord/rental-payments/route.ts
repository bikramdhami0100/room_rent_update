import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { connectDB } from "@/lib/db/connect"
import RentPayment from "@/lib/db/models/RentPayment"

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req: req as any, secret: process.env.AUTH_SECRET })
    if (!token || token.role !== "landlord") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()
    const { searchParams } = new URL(req.url)
    const contractId = searchParams.get("contractId") || ""
    const year = searchParams.get("year") || ""

    const filter: Record<string, unknown> = { landlordId: token.id }
    if (contractId) filter.contractId = contractId
    if (year) filter.year = parseInt(year)

    const payments = await RentPayment.find(filter)
      .populate("studentId")
      .sort({ year: -1, month: -1 })
      .lean()

    return NextResponse.json({ payments })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
