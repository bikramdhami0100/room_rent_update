import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { connectDB } from "@/lib/db/connect"
import LandlordDocument from "@/lib/db/models/LandlordDocument"

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req: req as any, secret: process.env.AUTH_SECRET })
    if (!token?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const docs = await LandlordDocument.find({ userId: token.id })
    if (docs.length === 0) {
      return NextResponse.json({ error: "No documents to submit" }, { status: 400 })
    }

    const identityTypes = ["citizenship", "passport", "driving_license", "pan_card", "voter_card"]
    const hasIdentity = docs.some((d) => identityTypes.includes(d.documentType))
    const hasRoomPhotos = docs.some((d) => d.documentType === "room_photos")
    const hasAddress = docs.some((d) => d.documentType === "address")

    if (!hasIdentity) {
      return NextResponse.json({
        error: "At least one identity document (citizenship, passport, driving license, PAN card, or voter card) is required",
      }, { status: 400 })
    }
    if (!hasRoomPhotos) {
      return NextResponse.json({ error: "Room photos are required" }, { status: 400 })
    }
    if (!hasAddress) {
      return NextResponse.json({ error: "Address proof is required" }, { status: 400 })
    }

    await LandlordDocument.updateMany(
      { userId: token.id },
      { submittedAt: new Date() }
    )

    return NextResponse.json({ success: true, message: "Documents submitted for verification" })
  } catch {
    return NextResponse.json({ error: "Failed to submit documents" }, { status: 500 })
  }
}
