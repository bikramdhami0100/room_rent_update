import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { connectDB } from "@/lib/db/connect"
import RentalContract from "@/lib/db/models/RentalContract"
import RentPayment from "@/lib/db/models/RentPayment"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = await getToken({ req: req as any, secret: process.env.AUTH_SECRET })
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    await connectDB()
    const { id } = await params
    const contract = await RentalContract.findById(id).populate("studentId roomId").lean()
    if (!contract) return NextResponse.json({ error: "Contract not found" }, { status: 404 })

    const isOwner = token.role === "admin" ||
      contract.studentId?._id?.toString() === token.id ||
      contract.landlordId?.toString() === token.id
    if (!isOwner) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const payments = await RentPayment.find({ contractId: id }).sort({ year: -1, month: -1 }).lean()

    return NextResponse.json({ contract, payments })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = await getToken({ req: req as any, secret: process.env.AUTH_SECRET })
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    await connectDB()
    const { id } = await params
    const body = await req.json()

    const contract = await RentalContract.findById(id)
    if (!contract) return NextResponse.json({ error: "Contract not found" }, { status: 404 })

    if (token.role === "student" && contract.studentId.toString() !== token.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (token.role === "landlord" && contract.landlordId.toString() !== token.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (body.status === "terminated") {
      if (token.role !== "landlord" && token.role !== "admin") {
        return NextResponse.json({ error: "Only landlord or admin can terminate" }, { status: 401 })
      }
      body.terminationDate = new Date()
      body.endDate = new Date()
    }

    Object.assign(contract, body)
    await contract.save()

    return NextResponse.json({ success: true, contract })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
