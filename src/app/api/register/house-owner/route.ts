import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { connectDB } from "@/lib/db/connect"
import User from "@/lib/db/models/User"

export async function PATCH(req: NextRequest) {
  try {
    const token = await getToken({ req: req as any, secret: process.env.AUTH_SECRET })
    if (!token || token.role !== "landlord") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    await connectDB()

    await User.findByIdAndUpdate(token.id, {
      isHouseOwner: body.isHouseOwner === true,
      ...(body.citizenshipNumber ? { citizenshipNumber: body.citizenshipNumber } : {}),
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
