import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { connectDB } from "@/lib/db/connect"
import Room from "@/lib/db/models/Room"
import User from "@/lib/db/models/User"
import Confirmation from "@/lib/db/models/Confirmation"
import { sendEmail } from "@/lib/email"

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req: req as any, secret: process.env.AUTH_SECRET })
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const isStudent = searchParams.get("student") === "true"

    const search = searchParams.get("search") || ""
    const status = searchParams.get("status") || ""
    const sortBy = searchParams.get("sortBy") || "confirmedAt"
    const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc"
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "10")))
    const skip = (page - 1) * limit

    await connectDB()

    const filter: Record<string, unknown> = {}
    if (isStudent && token.role === "student") {
      filter.studentId = token.id
    } else if (!isStudent && token.role === "landlord") {
      filter.landlordId = token.id
    }

    if (status && ["pending", "paid", "overdue"].includes(status)) {
      filter.paymentStatus = status
    }

    if (search) {
      const matchingRooms = await Room.find({
        title: { $regex: search, $options: "i" },
      })
        .select("_id")
        .lean()

      const roomIds = matchingRooms.map((r) => r._id)
      if (roomIds.length > 0) {
        filter.roomId = { $in: roomIds }
      } else {
        return NextResponse.json({
          bookings: [],
          total: 0,
          page,
          totalPages: 0,
        })
      }
    }

    const [confirmations, total] = await Promise.all([
      Confirmation.find(filter)
        .populate("studentId roomId")
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit)
        .lean(),
      Confirmation.countDocuments(filter),
    ])

    return NextResponse.json({
      bookings: confirmations,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req: req as any, secret: process.env.AUTH_SECRET })
    if (!token || token.role !== "student") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { roomId } = body

    if (!roomId) {
      return NextResponse.json({ error: "roomId is required" }, { status: 400 })
    }

    await connectDB()

    const user = await User.findById(token.id)
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    if (user.isSuspended) {
      return NextResponse.json(
        { error: "Your account is suspended due to unpaid commission. Please pay to reactivate." },
        { status: 403 }
      )
    }

    const room = await Room.findById(roomId)

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 })
    }

    const existingConfirmation = await Confirmation.findOne({
      studentId: token.id,
      roomId,
      paymentStatus: { $in: ["pending", "paid"] },
    })

    if (existingConfirmation) {
      return NextResponse.json(
        { error: "You already have an active confirmation for this room" },
        { status: 409 }
      )
    }

    const commission = Math.round(room.monthlyRent * 0.005)
    const commissionDeadline = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)

    const confirmation = await Confirmation.create({
      studentId: token.id,
      roomId,
      landlordId: room.landlordId,
      commission,
      commissionDeadline,
    })

    if (user.email) {
      sendEmail({
        to: user.email,
        subject: "Stay Confirmed - RoomRent",
        text: `You have confirmed your stay at ${room.title}. Please pay the commission of Rs. ${commission} within 3 days (by ${commissionDeadline.toLocaleDateString()}) to avoid account suspension.`,
      }).catch(() => {})

      const landlord = await User.findById(room.landlordId)
      if (landlord?.email) {
        sendEmail({
          to: landlord.email,
          subject: "New Booking Confirmation - RoomRent",
          text: `${user.name} has confirmed their stay at your room "${room.title}". They will pay the commission within 3 days.`,
        }).catch(() => {})
      }
    }

    return NextResponse.json({ success: true, confirmation })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
