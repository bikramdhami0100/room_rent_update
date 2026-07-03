import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { connectDB } from "@/lib/db/connect"
import RentPayment from "@/lib/db/models/RentPayment"
import RentalContract from "@/lib/db/models/RentalContract"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = await getToken({ req: req as any, secret: process.env.AUTH_SECRET })
    if (!token || token.role !== "landlord") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()
    const { id } = await params
    const body = await req.json()
    const { status } = body
    if (!status || !["approved", "rejected"].includes(status)) {
      return NextResponse.json({ error: "Status must be 'approved' or 'rejected'" }, { status: 400 })
    }

    const payment = await RentPayment.findById(id)
    if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 })

    const contract = await RentalContract.findById(payment.contractId)
    if (!contract || contract.landlordId.toString() !== token.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const update: Record<string, any> = { status }
    if (status === "approved") update.paidAt = new Date()

    await RentPayment.findByIdAndUpdate(id, update)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = await getToken({ req: req as any, secret: process.env.AUTH_SECRET })
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    await connectDB()
    const { id } = await params
    const payment = await RentPayment.findById(id)
    if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 })

    if (token.role === "student" && payment.studentId.toString() !== token.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await RentPayment.findByIdAndDelete(id)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
