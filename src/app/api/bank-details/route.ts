import { NextResponse } from "next/server"
import { connectDB } from "@/lib/db/connect"
import BankDetail from "@/lib/db/models/BankDetail"

export async function GET() {
  try {
    await connectDB()
    const banks = await BankDetail.find({ isActive: true }).lean()
    return NextResponse.json(banks)
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
