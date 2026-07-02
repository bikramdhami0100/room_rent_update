import { NextResponse } from "next/server"
import { connectDB } from "@/lib/db/connect"
import User from "@/lib/db/models/User"
import { sendEmail } from "@/lib/email"
import crypto from "crypto"

export async function POST(req: Request) {
  try {
    const { email } = await req.json()

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    await connectDB()

    const user = await User.findOne({ email })
    if (!user) {
      return NextResponse.json({ success: true, message: "If the email exists, a reset link has been sent" })
    }

    const resetToken = crypto.randomBytes(32).toString("hex")
    const resetTokenExpiry = new Date(Date.now() + 3600000)

    user.resetToken = resetToken
    user.resetTokenExpiry = resetTokenExpiry
    await user.save()

    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/reset-password?token=${resetToken}&email=${email}`

    await sendEmail({
      to: email,
      subject: "Password Reset - RoomRent",
      html: `<p>Click <a href="${resetUrl}">here</a> to reset your password. This link expires in 1 hour.</p>`,
    })

    return NextResponse.json({ success: true, message: "If the email exists, a reset link has been sent" })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
