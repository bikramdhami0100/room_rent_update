import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { connectDB } from "@/lib/db/connect"
import RentalContract from "@/lib/db/models/RentalContract"
import Room from "@/lib/db/models/Room"

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req: req as any, secret: process.env.AUTH_SECRET })
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    await connectDB()
    const { searchParams } = new URL(req.url)
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "10")))
    const skip = (page - 1) * limit
    const status = searchParams.get("status") || ""

    const filter: Record<string, unknown> = {}
    if (token.role === "student") filter.studentId = token.id
    else if (token.role === "landlord") filter.landlordId = token.id
    if (status && ["active", "terminated", "completed"].includes(status)) filter.status = status

    const [contracts, total] = await Promise.all([
      RentalContract.find(filter)
        .populate("studentId roomId")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      RentalContract.countDocuments(filter),
    ])

    return NextResponse.json({ contracts, total, page, totalPages: Math.ceil(total / limit) })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req: req as any, secret: process.env.AUTH_SECRET })
    if (!token || token.role !== "student") {
      return NextResponse.json({ error: "Only students can create rental contracts" }, { status: 401 })
    }

    const body = await req.json()
    const { roomId, startDate } = body
    if (!roomId || !startDate) {
      return NextResponse.json({ error: "roomId and startDate are required" }, { status: 400 })
    }

    await connectDB()
    const room = await Room.findById(roomId)
    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 })

    const existing = await RentalContract.findOne({
      studentId: token.id,
      roomId,
      status: "active",
    })
    if (existing) {
      return NextResponse.json({ error: "You already have an active contract for this room" }, { status: 409 })
    }

    const perDayRate = Math.round(room.monthlyRent / 30)

    const contract = await RentalContract.create({
      studentId: token.id,
      roomId,
      landlordId: room.landlordId,
      startDate: new Date(startDate),
      monthlyRent: room.monthlyRent,
      status: "active",
      perDayRate,
    })

    return NextResponse.json({ success: true, contract })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
