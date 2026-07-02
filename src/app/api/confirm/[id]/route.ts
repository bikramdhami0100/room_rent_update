import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { connectDB } from "@/lib/db/connect"
import Confirmation from "@/lib/db/models/Confirmation"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = await getToken({ req: req as any, secret: process.env.AUTH_SECRET })

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    await connectDB()

    const confirmation = await Confirmation.findById(id)
      .populate("studentId roomId landlordId")
      .lean()

    if (!confirmation) {
      return NextResponse.json({ error: "Confirmation not found" }, { status: 404 })
    }

    const userId = token.id
    const confirmationObj = confirmation as { studentId?: { _id: string }; landlordId?: { _id: string } }

    const isStudent = confirmationObj.studentId?._id?.toString() === userId
    const isLandlord = confirmationObj.landlordId?._id?.toString() === userId
    const isAdmin = token.role === "admin"

    if (!isStudent && !isLandlord && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    return NextResponse.json(confirmation)
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = await getToken({ req: req as any, secret: process.env.AUTH_SECRET })
    if (!token || token.role !== "student") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    await connectDB()

    const confirmation = await Confirmation.findById(id)
    if (!confirmation) {
      return NextResponse.json({ error: "Confirmation not found" }, { status: 404 })
    }

    if (confirmation.studentId.toString() !== token.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (confirmation.paymentStatus !== "pending" && confirmation.paymentStatus !== "paid") {
      return NextResponse.json(
        { error: "Only pending or paid bookings can be deleted" },
        { status: 400 }
      )
    }

    await Confirmation.findByIdAndDelete(id)

    return NextResponse.json({ success: true, message: "Booking cancelled" })
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
