import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db/connect"
import Room from "@/lib/db/models/Room"
import Confirmation from "@/lib/db/models/Confirmation"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const location = searchParams.get("location")
    const maxPrice = searchParams.get("maxPrice")
    const facilities = searchParams.get("facilities")
    const roomType = searchParams.get("roomType")
    const q = searchParams.get("q")
    const sortBy = searchParams.get("sortBy") || "createdAt"
    const order = searchParams.get("order") || "desc"
    const page = Math.max(1, Number(searchParams.get("page")) || 1)
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit")) || 12))
    const lat = searchParams.get("lat")
    const lng = searchParams.get("lng")
    const radius = Math.max(1, Number(searchParams.get("radius")) || 10)

    await connectDB()

    const filter: Record<string, unknown> = {
      isActive: true,
      isApproved: true,
    }

    if (lat && lng) {
      filter.latitude = { $exists: true, $ne: null }
      filter.longitude = { $exists: true, $ne: null }
    }

    if (location) {
      const locationRegex = new RegExp(location, "i")
      filter.$or = [
        { location: locationRegex },
        { address: locationRegex },
      ]
    }

    if (q) {
      const searchRegex = new RegExp(q, "i")
      const searchFilter = [
        { title: searchRegex },
        { description: searchRegex },
        { location: searchRegex },
        { address: searchRegex },
      ]
      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, { $or: searchFilter }]
        delete filter.$or
      } else {
        filter.$or = searchFilter
      }
    }

    if (maxPrice) {
      filter.monthlyRent = { $lte: Number(maxPrice) }
    }

    if (facilities) {
      const facilityList = facilities.split(",").map((f) => f.trim())
      filter.facilities = {
        $in: facilityList.map((f) => new RegExp(f, "i")),
      }
    }

    if (roomType) {
      filter.roomType = roomType.toLowerCase()
    }

    const sortField = sortBy === "price" ? "monthlyRent" : "createdAt"
    const sortOrder = order === "asc" ? 1 : -1

    const [total, rooms] = await Promise.all([
      Room.countDocuments(filter),
      Room.find(filter)
        .populate("landlordId", "name phone")
        .sort(sortBy === "distance" ? undefined : { [sortField]: sortOrder })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ])

    const roomIds = rooms.map((r) => r._id)
    const bookingCounts = await Confirmation.aggregate([
      { $match: { roomId: { $in: roomIds }, paymentStatus: { $in: ["pending", "paid"] } } },
      { $group: { _id: "$roomId", count: { $sum: 1 } } },
    ])

    const bookingMap = new Map<string, number>()
    for (const b of bookingCounts) {
      bookingMap.set(b._id.toString(), b.count)
    }

    const userLat = lat ? Number(lat) : null
    const userLng = lng ? Number(lng) : null

    function haversineDistance(
      lat1: number, lng1: number,
      lat2: number, lng2: number
    ): number {
      const R = 6371
      const dLat = ((lat2 - lat1) * Math.PI) / 180
      const dLng = ((lng2 - lng1) * Math.PI) / 180
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLng / 2) ** 2
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    }

    let roomsWithBooking = rooms.map((room) => {
      let distance: number | null = null
      if (userLat !== null && userLng !== null && room.latitude && room.longitude) {
        distance = haversineDistance(
          userLat, userLng,
          room.latitude, room.longitude
        )
      }
      return {
        ...room,
        _id: room._id.toString(),
        landlordId: room.landlordId
          ? { ...(room.landlordId as Record<string, unknown>), _id: (room.landlordId as Record<string, unknown>)._id?.toString() }
          : null,
        bookedCount: bookingMap.get(room._id.toString()) || 0,
        distance,
      }
    })

    if (userLat !== null && userLng !== null) {
      roomsWithBooking = roomsWithBooking.filter(
        (r) => r.distance !== null && r.distance <= radius
      )
    }

    if (sortBy === "distance") {
      roomsWithBooking.sort((a, b) => {
        const da = a.distance ?? Infinity
        const db = b.distance ?? Infinity
        return order === "asc" ? da - db : db - da
      })
    }

    return NextResponse.json({
      rooms: roomsWithBooking,
      total: roomsWithBooking.length,
      page,
      limit,
      totalPages: Math.ceil(roomsWithBooking.length / limit),
    })
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
