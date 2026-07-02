import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { getToken } from "next-auth/jwt"
import { connectDB } from "@/lib/db/connect"
import User from "@/lib/db/models/User"

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req: req as any, secret: process.env.AUTH_SECRET })

    if (!token?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const user = await User.findById(token.id).select("name email phone").lean()

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({
      name: user.name,
      email: user.email,
      phone: user.phone || "",
    })
  } catch (error) {
    console.error("Profile GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const token = await getToken({ req: req as any, secret: process.env.AUTH_SECRET })

    if (!token?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { name, phone, currentPassword, newPassword } = body

    await connectDB()

    const user = await User.findById(token.id)

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    if (name) user.name = name
    if (phone !== undefined) user.phone = phone

    if (currentPassword && newPassword) {
      if (!user.password) {
        return NextResponse.json(
          { error: "Cannot change password for OAuth accounts" },
          { status: 400 }
        )
      }

      const isValid = await bcrypt.compare(currentPassword, user.password)
      if (!isValid) {
        return NextResponse.json(
          { error: "Current password is incorrect" },
          { status: 400 }
        )
      }

      user.password = await bcrypt.hash(newPassword, 12)
    }

    await user.save()

    return NextResponse.json({
      name: user.name,
      email: user.email,
      phone: user.phone || "",
    })
  } catch (error) {
    console.error("Profile PUT error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
