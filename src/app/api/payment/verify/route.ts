import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { connectDB } from "@/lib/db/connect"
import Payment from "@/lib/db/models/Payment"
import Confirmation from "@/lib/db/models/Confirmation"
import User from "@/lib/db/models/User"
import PaymentRequestLog from "@/lib/db/models/PaymentRequestLog"
import PaymentResponseLog from "@/lib/db/models/PaymentResponseLog"
import { lookupKhaltiPayment } from "@/lib/payment/khalti"
import { decodeEsewaData, verifyEsewaPayment } from "@/lib/payment/esewa"
import { createLandlordEarning } from "@/lib/earning"

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req: req as any, secret: process.env.AUTH_SECRET })
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { method, paymentId, pidx, esewaData } = body

    if (!method || !paymentId) {
      return NextResponse.json({ error: "method and paymentId are required" }, { status: 400 })
    }

    await connectDB()

    const payment = await Payment.findById(paymentId)
    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 })
    }

    if (payment.studentId.toString() !== token.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (payment.status === "paid") {
      return NextResponse.json({ success: true, message: "Already paid" })
    }

    // Log payment verify request
    await PaymentRequestLog.create({
      method,
      endpoint: "/api/payment/verify",
      payload: body,
      headers: Object.fromEntries(req.headers),
      paymentId,
      userId: token.id,
      ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "",
      userAgent: req.headers.get("user-agent") || "",
    })

    let transactionId = ""

    if (method === "khalti") {
      if (!pidx) {
        await PaymentResponseLog.create({
          method,
          endpoint: "/api/payment/verify",
          requestPayload: body,
          responseBody: { error: "pidx is required for Khalti" },
          statusCode: 400,
          paymentId,
          userId: token.id,
          isSuccess: false,
        })
        return NextResponse.json({ error: "pidx is required for Khalti" }, { status: 400 })
      }

      const lookupResult = await lookupKhaltiPayment(pidx)

      if (lookupResult.status !== "Completed") {
        await PaymentResponseLog.create({
          method,
          endpoint: "/api/payment/verify",
          requestPayload: body,
          responseBody: lookupResult as unknown as Record<string, unknown>,
          statusCode: 400,
          paymentId,
          userId: token.id,
          isSuccess: false,
        })
        return NextResponse.json({ error: `Payment not completed: ${lookupResult.status}` }, { status: 400 })
      }

      transactionId = lookupResult.transaction_id || pidx
      payment.transactionId = transactionId
      payment.status = "paid"
      payment.paidAt = new Date()
      await payment.save()

      await PaymentResponseLog.create({
        method,
        endpoint: "/api/payment/verify",
        requestPayload: body,
        responseBody: lookupResult as unknown as Record<string, unknown>,
        statusCode: 200,
        transactionId,
        paymentId,
        userId: token.id,
        isSuccess: true,
      })
    } else if (method === "esewa") {
      if (!esewaData) {
        await PaymentResponseLog.create({
          method,
          endpoint: "/api/payment/verify",
          requestPayload: body,
          responseBody: { error: "esewaData is required for eSewa" },
          statusCode: 400,
          paymentId,
          userId: token.id,
          isSuccess: false,
        })
        return NextResponse.json({ error: "esewaData is required for eSewa" }, { status: 400 })
      }

      const decoded = decodeEsewaData(esewaData)

      const statusResult = await verifyEsewaPayment({
        productCode: decoded.product_code,
        totalAmount: decoded.total_amount,
        transactionUuid: decoded.transaction_uuid,
      })

      if (statusResult.status !== "COMPLETE") {
        await PaymentResponseLog.create({
          method,
          endpoint: "/api/payment/verify",
          requestPayload: body,
          responseBody: statusResult as unknown as Record<string, unknown>,
          statusCode: 400,
          paymentId,
          userId: token.id,
          isSuccess: false,
        })
        return NextResponse.json({ error: `Payment not completed: ${statusResult.status}` }, { status: 400 })
      }

      transactionId = decoded.transaction_uuid
      payment.transactionId = transactionId
      payment.status = "paid"
      payment.paidAt = new Date()
      await payment.save()

      await PaymentResponseLog.create({
        method,
        endpoint: "/api/payment/verify",
        requestPayload: body,
        responseBody: statusResult as unknown as Record<string, unknown>,
        statusCode: 200,
        transactionId,
        paymentId,
        userId: token.id,
        isSuccess: true,
      })
    } else if (method === "qrcode") {
      if (payment.method !== "qrcode") {
        return NextResponse.json({ error: "Payment method mismatch" }, { status: 400 })
      }

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

      await PaymentResponseLog.create({
        method,
        endpoint: "/api/payment/verify",
        requestPayload: body,
        responseBody: { status: "completed" },
        statusCode: 200,
        paymentId,
        userId: token.id,
        isSuccess: true,
      })
      return NextResponse.json({ success: true, message: "Payment completed successfully!" })
    } else {
      await PaymentResponseLog.create({
        method,
        endpoint: "/api/payment/verify",
        requestPayload: body,
        responseBody: { error: "Invalid payment method" },
        statusCode: 400,
        paymentId,
        userId: token.id,
        isSuccess: false,
      })
      return NextResponse.json({ error: "Invalid payment method" }, { status: 400 })
    }

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

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Payment verify error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
