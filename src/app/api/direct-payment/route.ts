import { NextResponse } from "next/server"
import { connectDB } from "@/lib/db/connect"
import DirectPaymentConfig from "@/lib/db/models/DirectPaymentConfig"

export async function GET() {
  try {
    await connectDB()
    const configs = await DirectPaymentConfig.find({ isActive: true }).lean()
    return NextResponse.json(configs)
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
