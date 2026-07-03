import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { connectDB } from "@/lib/db/connect"
import RentPayment from "@/lib/db/models/RentPayment"
import RentalContract from "@/lib/db/models/RentalContract"

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req: req as any, secret: process.env.AUTH_SECRET })
    if (!token || token.role !== "student") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()
    const { searchParams } = new URL(req.url)
    const contractId = searchParams.get("contractId") || ""

    const contractFilter: Record<string, unknown> = { studentId: token.id }
    if (contractId) contractFilter._id = contractId

    const contracts = await RentalContract.find(contractFilter).populate("roomId").lean()
    const payments = await RentPayment.find({ studentId: token.id })
      .populate("roomId contractId")
      .sort({ year: -1, month: -1 })
      .lean()

    return NextResponse.json({ contracts, payments })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
