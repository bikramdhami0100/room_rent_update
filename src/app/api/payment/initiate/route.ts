import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { connectDB } from "@/lib/db/connect"
import Confirmation from "@/lib/db/models/Confirmation"
import Payment from "@/lib/db/models/Payment"
import Room from "@/lib/db/models/Room"
import User from "@/lib/db/models/User"
import PaymentRequestLog from "@/lib/db/models/PaymentRequestLog"
import PaymentResponseLog from "@/lib/db/models/PaymentResponseLog"
import { initiateKhaltiPayment } from "@/lib/payment/khalti"
import { buildEsewaConfig } from "@/lib/payment/esewa"

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req: req as any, secret: process.env.AUTH_SECRET })
    if (!token || token.role !== "student") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { confirmationId, method } = await req.json()

    if (!confirmationId || !method) {
      return NextResponse.json({ error: "confirmationId and method are required" }, { status: 400 })
    }

    if (!["khalti", "esewa", "qrcode"].includes(method)) {
      return NextResponse.json({ error: "Invalid payment method" }, { status: 400 })
    }

    await connectDB()

    const confirmation = await Confirmation.findById(confirmationId).populate("roomId")

    if (!confirmation) {
      return NextResponse.json({ error: "Confirmation not found" }, { status: 404 })
    }

    if (confirmation.studentId.toString() !== token.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (confirmation.paymentStatus === "paid") {
      return NextResponse.json({ error: "Payment already completed" }, { status: 400 })
    }

    const user = await User.findById(token.id)
    const room = await Room.findById(confirmation.roomId)

    // Log payment request
    await PaymentRequestLog.create({
      method,
      endpoint: "/api/payment/initiate",
      payload: { confirmationId, method },
      headers: Object.fromEntries(req.headers),
      userId: token.id,
      ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "",
      userAgent: req.headers.get("user-agent") || "",
    })

    let payment = await Payment.findOne({
      confirmationId,
      status: "pending",
    })

    if (!payment) {
      payment = await Payment.create({
        confirmationId: confirmation._id,
        studentId: token.id,
        roomId: confirmation.roomId,
        landlordId: confirmation.landlordId,
        amount: confirmation.commission,
        method,
        status: "pending",
      })
    }

    if (method === "khalti") {
      const khaltiResult = await initiateKhaltiPayment({
        amount: confirmation.commission,
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
      // Log payment response
      await PaymentResponseLog.create({
        method,
        endpoint: "/api/payment/initiate",
        requestPayload: { confirmationId, method },
        responseBody: khaltiResult as unknown as Record<string, unknown>,
        statusCode: 200,
        paymentId: payment._id,
        userId: token.id,
        isSuccess: true,
      })
      return NextResponse.json({ paymentUrl: khaltiResult.payment_url })
    }

    if (method === "esewa") {
      const esewaConfig = buildEsewaConfig({
        amount: confirmation.commission,
        transactionUuid: payment._id.toString(),
        successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success?method=esewa&paymentId=${payment._id}`,
        failureUrl: `${process.env.NEXT_PUBLIC_APP_URL}/payment/failure`,
      })
      // Log payment response
      await PaymentResponseLog.create({
        method,
        endpoint: "/api/payment/initiate",
        requestPayload: { confirmationId, method },
        responseBody: { method: "esewa", esewaConfig: { ...esewaConfig, signature: "[REDACTED]" } } as unknown as Record<string, unknown>,
        statusCode: 200,
        paymentId: payment._id,
        userId: token.id,
        isSuccess: true,
      })
      return NextResponse.json({ method: "esewa", esewaConfig })
    }

    if (method === "qrcode") {
      await PaymentResponseLog.create({
        method,
        endpoint: "/api/payment/initiate",
        requestPayload: { confirmationId, method },
        responseBody: { paymentId: payment._id },
        statusCode: 200,
        paymentId: payment._id,
        userId: token.id,
        isSuccess: true,
      })
      return NextResponse.json({ method: "qrcode", paymentId: payment._id, amount: confirmation.commission })
    }

    return NextResponse.json({ error: "Invalid method" }, { status: 400 })
  } catch (error) {
    console.error("Payment initiate error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
