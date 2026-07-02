import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { connectDB } from "@/lib/db/connect"
import User from "@/lib/db/models/User"
import type { PayoutMethod, PayoutFrequency } from "@/types"

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req: req as any, secret: process.env.AUTH_SECRET })
    if (!token || token.role !== "landlord") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const user = await User.findById(token.id).select(
      "payoutMethod payoutAccountName payoutAccountNumber payoutBankName payoutQrCode payoutFrequency"
    ).lean()

    return NextResponse.json(user || {})
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const token = await getToken({ req: req as any, secret: process.env.AUTH_SECRET })
    if (!token || token.role !== "landlord") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const {
      payoutMethod,
      payoutAccountName,
      payoutAccountNumber,
      payoutBankName,
      payoutQrCode,
      payoutFrequency,
    } = body

    const validMethods: PayoutMethod[] = ["bank", "esewa", "khalti", "qrcode"]
    const validFrequencies: PayoutFrequency[] = [
      "weekly", "monthly", "thrice_monthly", "half_yearly", "yearly",
    ]

    if (payoutMethod && !validMethods.includes(payoutMethod)) {
      return NextResponse.json({ error: "Invalid payout method" }, { status: 400 })
    }

    if (payoutFrequency && !validFrequencies.includes(payoutFrequency)) {
      return NextResponse.json({ error: "Invalid payout frequency" }, { status: 400 })
    }

    await connectDB()

    const updateData: Record<string, unknown> = {}
    if (payoutMethod !== undefined) updateData.payoutMethod = payoutMethod
    if (payoutAccountName !== undefined) updateData.payoutAccountName = payoutAccountName
    if (payoutAccountNumber !== undefined) updateData.payoutAccountNumber = payoutAccountNumber
    if (payoutBankName !== undefined) updateData.payoutBankName = payoutBankName
    if (payoutQrCode !== undefined) updateData.payoutQrCode = payoutQrCode
    if (payoutFrequency !== undefined) updateData.payoutFrequency = payoutFrequency

    await User.findByIdAndUpdate(token.id, updateData)

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const token = await getToken({ req: req as any, secret: process.env.AUTH_SECRET })
    if (!token || token.role !== "landlord") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    await User.findByIdAndUpdate(token.id, {
      $unset: {
        payoutMethod: "",
        payoutAccountName: "",
        payoutAccountNumber: "",
        payoutBankName: "",
        payoutQrCode: "",
        payoutFrequency: "",
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
