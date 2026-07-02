import { NextResponse } from "next/server"
import { connectDB } from "@/lib/db/connect"
import Room from "@/lib/db/models/Room"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    await connectDB()

    const room = await Room.findById(id)
      .populate("landlordId", "name phone email")
      .lean()

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 })
    }

    return NextResponse.json(room)
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
