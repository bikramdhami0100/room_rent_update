import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { connectDB } from "@/lib/db/connect"
import RentPayment from "@/lib/db/models/RentPayment"
import RentalContract from "@/lib/db/models/RentalContract"

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req: req as any, secret: process.env.AUTH_SECRET })
    if (!token || token.role !== "student") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { contractId, amount, month, year, method, transactionId, screenshotUrl } = body
    if (!contractId || !amount || !month || !year) {
      return NextResponse.json({ error: "contractId, amount, month, year required" }, { status: 400 })
    }

    await connectDB()

    const contract = await RentalContract.findById(contractId)
    if (!contract) return NextResponse.json({ error: "Contract not found" }, { status: 404 })
    if (contract.studentId.toString() !== token.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (contract.status !== "active") {
      return NextResponse.json({ error: "Contract is not active" }, { status: 400 })
    }

    const existing = await RentPayment.findOne({ contractId, year, month })
    if (existing) {
      return NextResponse.json({ error: "Payment for this month already exists" }, { status: 409 })
    }

    const payment = await RentPayment.create({
      contractId,
      studentId: token.id,
      roomId: contract.roomId,
      landlordId: contract.landlordId,
      amount,
      month,
      year,
      status: "pending",
      method: method || "cash",
      transactionId,
      screenshotUrl,
    })

    return NextResponse.json({ success: true, payment })
  } catch (error) {
    console.error("Error creating payment:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
