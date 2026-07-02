import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { connectDB } from "@/lib/db/connect"
import Payment from "@/lib/db/models/Payment"
import Confirmation from "@/lib/db/models/Confirmation"
import User from "@/lib/db/models/User"
import Room from "@/lib/db/models/Room"
import { createLandlordEarning } from "@/lib/earning"

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req: req as any, secret: process.env.AUTH_SECRET })

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const { searchParams } = new URL(req.url)
    const statusFilter = searchParams.get("status")
    const sortBy = searchParams.get("sortBy") || "createdAt"
    const sortOrder = searchParams.get("sortOrder") || "desc"
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")))
    const skip = (page - 1) * limit

    const filter: Record<string, unknown> = {}

    if (token.role === "landlord") {
      filter.landlordId = token.id
    } else if (token.role === "student") {
      filter.studentId = token.id
    }

    if (statusFilter && statusFilter !== "all") {
      filter.status = statusFilter
    }

    const sort: Record<string, 1 | -1> = { [sortBy]: sortOrder === "asc" ? 1 : -1 }

    const [payments, total] = await Promise.all([
      Payment.find(filter)
        .populate("roomId studentId")
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Payment.countDocuments(filter),
    ])

    return NextResponse.json({
      payments,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req: req as any, secret: process.env.AUTH_SECRET })

    if (!token || token.role !== "student") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { confirmationId, method } = body

    if (!confirmationId || !method) {
      return NextResponse.json(
        { error: "confirmationId and method are required" },
        { status: 400 }
      )
    }

    if (!["khalti", "esewa", "qrcode"].includes(method)) {
      return NextResponse.json(
        { error: "Invalid payment method" },
        { status: 400 }
      )
    }

    await connectDB()

    const confirmation = await Confirmation.findById(confirmationId)

    if (!confirmation) {
      return NextResponse.json({ error: "Confirmation not found" }, { status: 404 })
    }

    if (confirmation.studentId.toString() !== token.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (confirmation.paymentStatus === "paid") {
      return NextResponse.json(
        { error: "Payment already completed" },
        { status: 400 }
      )
    }

    const room = await Room.findById(confirmation.roomId)

    const payment = await Payment.create({
      confirmationId,
      studentId: token.id,
      roomId: confirmation.roomId,
      landlordId: confirmation.landlordId,
      amount: confirmation.commission,
      method,
      status: "paid",
      paidAt: new Date(),
    })

    confirmation.paymentStatus = "paid"
    await confirmation.save()

    await User.findByIdAndUpdate(token.id, {
      commissionDue: 0,
      isSuspended: false,
    })

    await createLandlordEarning(payment._id.toString())

    return NextResponse.json({ success: true, payment })
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
