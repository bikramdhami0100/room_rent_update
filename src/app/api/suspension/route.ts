import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { connectDB } from "@/lib/db/connect"
import User from "@/lib/db/models/User"
import Confirmation from "@/lib/db/models/Confirmation"
import Payment from "@/lib/db/models/Payment"
import Room from "@/lib/db/models/Room"
import { sendEmail } from "@/lib/email"
import { initiateKhaltiPayment } from "@/lib/payment/khalti"
import { buildEsewaConfig } from "@/lib/payment/esewa"

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req: req as any, secret: process.env.AUTH_SECRET })
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const user = await User.findById(token.id).lean()

    const overdueConfirmations = await Confirmation.find({
      studentId: token.id,
      paymentStatus: "overdue",
    }).lean()

    const totalDue = overdueConfirmations.reduce((sum, c) => sum + c.commission, 0)

    return NextResponse.json({
      isSuspended: user?.isSuspended || false,
      suspensionReason: user?.suspensionReason || null,
      commissionDue: user?.commissionDue || totalDue || 0,
    })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req: req as any, secret: process.env.AUTH_SECRET })
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { method } = body

    if (!method || !["khalti", "esewa", "qrcode"].includes(method)) {
      return NextResponse.json({ error: "Invalid payment method" }, { status: 400 })
    }

    await connectDB()

    const confirmations = await Confirmation.find({
      studentId: token.id,
      paymentStatus: { $in: ["pending", "overdue"] },
    })

    if (confirmations.length === 0) {
      return NextResponse.json({ error: "No pending or overdue confirmation found" }, { status: 404 })
    }

    const user = await User.findById(token.id)
    const totalDue = confirmations.reduce((s, c) => s + c.commission, 0)

    if (method === "qrcode") {
      for (const confirmation of confirmations) {
        await Payment.create({
          confirmationId: confirmation._id,
          studentId: token.id,
          roomId: confirmation.roomId,
          landlordId: confirmation.landlordId,
          amount: confirmation.commission,
          method: "qrcode",
          status: "pending",
        })
      }

      if (user?.email) {
        sendEmail({
          to: user.email,
          subject: "Payment Submitted - RoomRent",
          text: `Your QR code payment of Rs. ${totalDue} has been submitted for verification. An admin will verify it shortly.`,
        }).catch(() => {})
      }

      return NextResponse.json({ success: true, message: "Payment submitted for verification" })
    }

    const firstConfirmation = confirmations[0]
    const room = await Room.findById(firstConfirmation.roomId)
    const payment = await Payment.create({
      confirmationId: firstConfirmation._id,
      studentId: token.id,
      roomId: firstConfirmation.roomId,
      landlordId: firstConfirmation.landlordId,
      amount: totalDue,
      method,
      status: "pending",
    })

    if (method === "khalti") {
      const khaltiResult = await initiateKhaltiPayment({
        amount: totalDue,
        purchaseOrderId: payment._id.toString(),
        purchaseOrderName: `Commission for ${room?.title || "Room"}`,
        returnUrl: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success?method=khalti&paymentId=${payment._id}`,
        websiteUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        customerInfo: {
          name: user?.name || "Student",
          email: user?.email || "",
          phone: user?.phone || "",
        },
      })
      return NextResponse.json({ paymentUrl: khaltiResult.payment_url })
    }

    if (method === "esewa") {
      const esewaConfig = buildEsewaConfig({
        amount: totalDue,
        transactionUuid: payment._id.toString(),
        successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success?method=esewa&paymentId=${payment._id}`,
        failureUrl: `${process.env.NEXT_PUBLIC_APP_URL}/payment/failure`,
      })
      return NextResponse.json({ method: "esewa", esewaConfig })
    }

    return NextResponse.json({ error: "Invalid method" }, { status: 400 })
  } catch (error) {
    console.error("Suspension payment error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
