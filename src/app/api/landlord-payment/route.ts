import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { connectDB } from "@/lib/db/connect"
import RentalContract from "@/lib/db/models/RentalContract"
import User from "@/lib/db/models/User"

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req: req as any, secret: process.env.AUTH_SECRET })
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const contractId = searchParams.get("contractId")
    if (!contractId) return NextResponse.json({ error: "contractId required" }, { status: 400 })

    await connectDB()

    const contract = await RentalContract.findById(contractId).lean()
    if (!contract) return NextResponse.json({ error: "Contract not found" }, { status: 404 })

    if (String(contract.studentId) !== token.id && token.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const landlord = await User.findById(contract.landlordId).select(
      "name payoutMethod payoutAccountName payoutAccountNumber payoutBankName payoutQrCode"
    ).lean()

    return NextResponse.json({ landlord })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
