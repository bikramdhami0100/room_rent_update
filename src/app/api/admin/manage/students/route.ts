import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db/connect"
import User from "@/lib/db/models/User"
import bcrypt from "bcryptjs"
import { getToken } from "next-auth/jwt"

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req: req as any, secret: process.env.AUTH_SECRET })
    if (!token || token.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const search = searchParams.get("search")
    const role = searchParams.get("role") || "student"
    const status = searchParams.get("status")
    const sortBy = searchParams.get("sortBy") || "createdAt"
    const sortOrder = searchParams.get("sortOrder") || "desc"
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")))
    const skip = (page - 1) * limit

    await connectDB()

    const filter: Record<string, unknown> = {}
    if (role && role !== "all") filter.role = role

    if (status && status !== "all") {
      filter.isSuspended = status === "suspended"
    }

    if (search) {
      const regex = { $regex: search, $options: "i" }
      filter.$or = [
        { name: regex },
        { email: regex },
        { phone: regex },
      ]
    }

    const sort: Record<string, 1 | -1> = { [sortBy]: sortOrder === "asc" ? 1 : -1 }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select("-password")
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ])

    return NextResponse.json({
      users,
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

    const { userId, action, reason } = await req.json()

    if (!userId || !action || !["suspend", "unsuspend"].includes(action)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

    await connectDB()

    if (action === "suspend") {
      await User.findByIdAndUpdate(userId, {
        isSuspended: true,
        suspensionReason: reason,
      })
    } else {
      await User.findByIdAndUpdate(userId, {
        isSuspended: false,
        suspensionReason: null,
      })
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
    const { _id, name, email, password, phone, role, isSuspended } = body

    await connectDB()

    if (_id) {
      const updateData: Record<string, unknown> = {}
      if (name !== undefined) updateData.name = name
      if (email !== undefined) updateData.email = email
      if (phone !== undefined) updateData.phone = phone
      if (role !== undefined) updateData.role = role
      if (isSuspended !== undefined) updateData.isSuspended = isSuspended
      if (password) {
        updateData.password = await bcrypt.hash(password, 10)
      }

      const user = await User.findByIdAndUpdate(_id, updateData, { new: true }).select("-password")
      if (!user) {
        return NextResponse.json({ error: "Not found" }, { status: 404 })
      }
      return NextResponse.json({ user })
    }

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Missing required fields (name, email, password)" }, { status: 400 })
    }

    const exists = await User.findOne({ email })
    if (exists) {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      phone,
      role: role || "student",
      isSuspended: isSuspended ?? false,
    })

    const { password: _, ...userWithoutPassword } = user.toObject()
    return NextResponse.json({ user: userWithoutPassword }, { status: 201 })
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
      return NextResponse.json({ error: "Missing user id" }, { status: 400 })
    }

    await connectDB()
    await User.findByIdAndDelete(id)

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
