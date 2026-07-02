import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db/connect"
import Room from "@/lib/db/models/Room"
import { getToken } from "next-auth/jwt"

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req: req as any, secret: process.env.AUTH_SECRET })
    if (!token || token.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status")
    const search = searchParams.get("search")
    const sortBy = searchParams.get("sortBy") || "createdAt"
    const sortOrder = searchParams.get("sortOrder") || "desc"
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")))
    const skip = (page - 1) * limit

    await connectDB()

    const filter: Record<string, unknown> = {}
    if (status && status !== "all") {
      if (status === "approved") filter.isApproved = true
      else if (status === "pending") filter.isApproved = false
    }

    if (search) {
      const regex = { $regex: search, $options: "i" }
      filter.$or = [
        { title: regex },
        { location: regex },
        { address: regex },
        { description: regex },
      ]
    }

    const sort: Record<string, 1 | -1> = { [sortBy]: sortOrder === "asc" ? 1 : -1 }

    const [listings, total] = await Promise.all([
      Room.find(filter)
        .populate("landlordId", "name email phone")
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Room.countDocuments(filter),
    ])

    return NextResponse.json({
      listings,
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
    if (!token || token.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const roomId = body.roomId || body.listingId
    const { action } = body

    if (!roomId || !action || !["approve", "reject", "toggle_active", "activate", "deactivate"].includes(action)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

    await connectDB()

    if (action === "approve") {
      await Room.findByIdAndUpdate(roomId, { isApproved: true })
    } else if (action === "reject") {
      await Room.findByIdAndUpdate(roomId, { isActive: false, isApproved: false })
    } else if (action === "activate") {
      await Room.findByIdAndUpdate(roomId, { isActive: true })
    } else if (action === "deactivate") {
      await Room.findByIdAndUpdate(roomId, { isActive: false })
    } else if (action === "toggle_active") {
      const room = await Room.findById(roomId)
      if (room) {
        room.isActive = !room.isActive
        await room.save()
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const token = await getToken({ req: req as any, secret: process.env.AUTH_SECRET })
    if (!token || token.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const {
      _id, landlordId, title, description, monthlyRent, location, address,
      latitude, longitude, whatsappNumber, facilities, roomType, photos, isActive, isApproved,
    } = body

    await connectDB()

    // Update existing room
    if (_id) {
      const updateData: Record<string, unknown> = {}
      if (landlordId !== undefined) updateData.landlordId = landlordId
      if (title !== undefined) updateData.title = title
      if (description !== undefined) updateData.description = description
      if (monthlyRent !== undefined) updateData.monthlyRent = monthlyRent
      if (location !== undefined) updateData.location = location
      if (address !== undefined) updateData.address = address
      if (latitude !== undefined) updateData.latitude = latitude
      if (longitude !== undefined) updateData.longitude = longitude
      if (whatsappNumber !== undefined) updateData.whatsappNumber = whatsappNumber
      if (facilities !== undefined) updateData.facilities = facilities
      if (roomType !== undefined) updateData.roomType = roomType
      if (photos !== undefined) updateData.photos = photos
      if (isActive !== undefined) updateData.isActive = isActive
      if (isApproved !== undefined) updateData.isApproved = isApproved

      const room = await Room.findByIdAndUpdate(_id, updateData, { new: true })
      if (!room) {
        return NextResponse.json({ error: "Not found" }, { status: 404 })
      }
      return NextResponse.json({ room })
    }

    // Create new room
    if (!title || !monthlyRent || !location || !address) {
      return NextResponse.json({ error: "Missing required fields (title, monthlyRent, location, address)" }, { status: 400 })
    }

    const room = await Room.create({
      landlordId: landlordId || token.id,
      title,
      description: description || "",
      monthlyRent,
      location,
      address,
      latitude,
      longitude,
      whatsappNumber,
      facilities: facilities || [],
      roomType: roomType || "",
      photos: photos || [],
      isActive: isActive ?? true,
      isApproved: isApproved ?? true,
    })

    return NextResponse.json({ room }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const token = await getToken({ req: req as any, secret: process.env.AUTH_SECRET })
    if (!token || token.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Missing listing id" }, { status: 400 })
    }

    await connectDB()

    const room = await Room.findById(id)
    if (!room) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 })
    }

    if (room.photos?.length) {
      const { unlink } = await import("fs/promises")
      const { join, basename } = await import("path")
      for (const url of room.photos) {
        try { await unlink(join(process.cwd(), "public", "uploads", basename(url))) } catch {}
      }
    }

    await Room.findByIdAndDelete(id)

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
