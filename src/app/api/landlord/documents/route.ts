import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { connectDB } from "@/lib/db/connect"
import LandlordDocument from "@/lib/db/models/LandlordDocument"

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req: req as any, secret: process.env.AUTH_SECRET })

    if (!token || token.role !== "landlord") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const documents = await LandlordDocument.find({
      userId: token.id,
    }).lean()

    return NextResponse.json(documents)
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

    if (!token || token.role !== "landlord") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { documentType, documentUrl } = body

    if (!documentType || !documentUrl) {
      return NextResponse.json(
        { error: "documentType and documentUrl are required" },
        { status: 400 }
      )
    }

    await connectDB()

    await LandlordDocument.findOneAndUpdate(
      { userId: token.id, documentType },
      { userId: token.id, documentType, documentUrl, status: "pending", submittedAt: null },
      { upsert: true, new: true }
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
