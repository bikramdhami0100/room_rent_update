import { NextResponse } from "next/server"
import { connectDB } from "@/lib/db/connect"
import Confirmation from "@/lib/db/models/Confirmation"
import User from "@/lib/db/models/User"
import { sendEmail, getSuspensionText, getDeadlineReminderText } from "@/lib/email"

export async function GET() {
  try {
    const cronSecret = process.env.CRON_SECRET
    // In production, validate cronSecret from header
    // const authHeader = req.headers.get("authorization")

    await connectDB()

    const now = new Date()

    const overdueConfirmations = await Confirmation.find({
      paymentStatus: "pending",
      commissionDeadline: { $lte: now },
    }).populate("studentId")

    for (const confirmation of overdueConfirmations) {
      confirmation.paymentStatus = "overdue"
      await confirmation.save()

      const student = await User.findById(confirmation.studentId)
      if (student) {
        student.isSuspended = true
        student.suspensionReason = `Unpaid commission of Rs. ${confirmation.commission}`
        student.commissionDue = (student.commissionDue || 0) + confirmation.commission
        await student.save()

        if (student.email) {
          sendEmail({
            to: student.email,
            subject: "Account Suspended - RoomRent",
            text: getSuspensionText(student.name, confirmation.commission),
          }).catch(() => {})
        }
      }
    }

    const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000)

    const soonDue = await Confirmation.find({
      paymentStatus: "pending",
      commissionDeadline: { $gte: now, $lte: twoDaysFromNow },
    }).populate("studentId")

    for (const confirmation of soonDue) {
      const student = await User.findById(confirmation.studentId)
      if (!student?.email) continue

      const daysLeft = Math.ceil((confirmation.commissionDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

      if (daysLeft === 2 || daysLeft === 1) {
        sendEmail({
          to: student.email,
          subject: `Reminder: Pay commission within ${daysLeft} day${daysLeft > 1 ? "s" : ""} - RoomRent`,
          text: getDeadlineReminderText(student.name, daysLeft, confirmation.commission, confirmation._id.toString()),
        }).catch(() => {})
      }
    }

    return NextResponse.json({
      processed: overdueConfirmations.length,
      reminders: soonDue.length,
    })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
