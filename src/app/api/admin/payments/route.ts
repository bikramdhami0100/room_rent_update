import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { connectDB } from "@/lib/db/connect"
import Payment from "@/lib/db/models/Payment"
import Confirmation from "@/lib/db/models/Confirmation"
import User from "@/lib/db/models/User"
import { createLandlordEarning } from "@/lib/earning"
import fs from "fs"
import path from "path"

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req: req as any, secret: process.env.AUTH_SECRET })
    if (!token || token.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const method = searchParams.get("method") || "all"
    const status = searchParams.get("status") || "pending"
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")))
    const skip = (page - 1) * limit

    await connectDB()

    const filter: Record<string, unknown> = {}
    if (method !== "all") filter.method = method
    if (status !== "all") filter.status = status

    const [payments, total] = await Promise.all([
      Payment.find(filter)
        .populate("studentId", "name email phone")
        .populate("roomId", "title monthlyRent location")
        .populate("bankId", "bankName accountHolderName accountNumber")
        .sort({ createdAt: -1 })
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
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req: req as any, secret: process.env.AUTH_SECRET })
    if (!token || token.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { paymentId, action } = await req.json()
    if (!paymentId || !action || !["verify", "reject"].includes(action)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

    await connectDB()

    const payment = await Payment.findById(paymentId)
    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 })
    }

    if (payment.status !== "pending") {
      return NextResponse.json({ error: "Payment already processed" }, { status: 400 })
    }

    if (action === "verify") {
      payment.status = "paid"
      payment.paidAt = new Date()
      await payment.save()

      const confirmation = await Confirmation.findById(payment.confirmationId)
      if (confirmation) {
        confirmation.paymentStatus = "paid"
        await confirmation.save()
      }

      await User.findByIdAndUpdate(payment.studentId, {
        commissionDue: 0,
        isSuspended: false,
      })

      await createLandlordEarning(payment._id.toString())
    }

    if (action === "reject") {
      payment.status = "rejected"
      if (payment.screenshotUrl) {
        const filePath = path.join(process.cwd(), "public", payment.screenshotUrl)
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath)
            console.log(`Deleted screenshot: ${filePath}`)
          }
        } catch (fileErr) {
          console.error("Failed to delete screenshot:", fileErr)
        }
      }
      await payment.save()
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Admin payments POST error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
