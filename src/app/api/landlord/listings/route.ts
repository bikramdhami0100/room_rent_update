import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { connectDB } from "@/lib/db/connect"
import Room from "@/lib/db/models/Room"
import LandlordDocument from "@/lib/db/models/LandlordDocument"

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req: req as any, secret: process.env.AUTH_SECRET })
    if (!token || token.role !== "landlord") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const rooms = await Room.find({ landlordId: token.id })
      .sort({ createdAt: -1 })
      .lean()

    return NextResponse.json(rooms)
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
    const { title, description, monthlyRent, location, address, latitude, longitude, whatsappNumber, photos, facilities, roomType, capacity } = body

    if (!title || !description || !monthlyRent || !location || !address) {
      return NextResponse.json(
        { error: "Title, description, monthly rent, location, and address are required" },
        { status: 400 }
      )
    }

    await connectDB()

    const docs = await LandlordDocument.find({ userId: token.id })
    const isVerified = docs.length > 0 && docs.every((d) => d.status === "approved")

    const room = await Room.create({
      landlordId: token.id,
      title,
      description,
      monthlyRent,
      location,
      address,
      latitude,
      longitude,
      whatsappNumber,
      photos: photos || [],
      facilities: facilities ? facilities.split(",").map((f: string) => f.trim()) : [],
      roomType,
      capacity: capacity || 1,
      isApproved: isVerified,
    })

    return NextResponse.json({ success: true, room })
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PUT(req: NextRequest) {
  try {
    const token = await getToken({ req: req as any, secret: process.env.AUTH_SECRET })

    if (!token || token.role !== "landlord") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { id, title, description, monthlyRent, location, address, latitude, longitude, whatsappNumber, photos, facilities, roomType, capacity } = body

    if (!id) {
      return NextResponse.json({ error: "Room ID is required" }, { status: 400 })
    }

    await connectDB()

    const room = await Room.findById(id)

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 })
    }

    if (room.landlordId.toString() !== token.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const updatedRoom = await Room.findByIdAndUpdate(
      id,
      {
        title,
        description,
        monthlyRent,
        location,
        address,
        latitude,
        longitude,
        whatsappNumber,
        photos: photos || [],
        facilities: facilities ? facilities.split(",").map((f: string) => f.trim()) : [],
        roomType,
        capacity: capacity || 1,
      },
      { new: true }
    )

    return NextResponse.json({ success: true, room: updatedRoom })
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const token = await getToken({ req: req as any, secret: process.env.AUTH_SECRET })

    if (!token || token.role !== "landlord") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { id } = body

    if (!id) {
      return NextResponse.json({ error: "Room ID is required" }, { status: 400 })
    }

    await connectDB()

    const room = await Room.findById(id)

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 })
    }

    if (room.landlordId.toString() !== token.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await Room.findByIdAndDelete(id)

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
