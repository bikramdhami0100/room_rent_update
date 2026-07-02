import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { connectDB } from "@/lib/db/connect"
import User from "@/lib/db/models/User"
import LandlordDocument from "@/lib/db/models/LandlordDocument"

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req: req as any, secret: process.env.AUTH_SECRET })
    if (!token || token.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status") || "pending"

    await connectDB()

    const landlords = await User.find({ role: "landlord" }).lean()

    const result = []
    for (const landlord of landlords) {
      const docFilter: Record<string, unknown> = { userId: landlord._id }
      if (status !== "all") {
        docFilter.status = status
      }
      const documents = await LandlordDocument.find(docFilter)
        .select("documentType documentUrl status adminComment")
        .lean()

      if (documents.length > 0) {
        result.push({
          ...landlord,
          documents,
        })
      }
    }

    return NextResponse.json(result)
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

    const { userId, action, comment } = await req.json()

    if (!userId || !action || !["approved", "rejected"].includes(action)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

    await connectDB()

    if (action === "approved") {
      await LandlordDocument.updateMany(
        { userId, status: "pending" },
        { $set: { status: "approved" } }
      )
    } else {
      const update: Record<string, unknown> = { status: "rejected" }
      if (comment) update.adminComment = comment
      await LandlordDocument.updateMany(
        { userId, status: "pending" },
        { $set: update }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
