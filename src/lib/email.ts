import nodemailer from "nodemailer"

interface EmailOptions {
  to: string
  subject: string
  text?: string
  html?: string
}

export async function sendEmail({ to, subject, text, html }: EmailOptions) {
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  const host = process.env.SMTP_HOST || "smtp.gmail.com"
  const port = Number(process.env.SMTP_PORT) || 587

  if (!user || !pass) {
    console.warn("SMTP credentials not configured, skipping email")
    return
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  })

  await transporter.sendMail({
    from: `"RoomRent" <${user}>`,
    to,
    subject,
    text,
    html,
  })
}

export function getDeadlineReminderText(name: string, daysLeft: number, amount: number, confirmationId: string): string {
  const paymentUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/payment/${confirmationId}`
  return `Dear ${name},

You have ${daysLeft} day${daysLeft > 1 ? "s" : ""} left to pay your commission of Rs. ${amount}.

Please pay immediately to avoid account suspension.

Payment link: ${paymentUrl}

Thank you,
RoomRent Team`
}

export function getSuspensionText(name: string, amount: number): string {
  const reactivateUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/suspended`
  return `Dear ${name},

Your account has been suspended due to unpaid commission of Rs. ${amount}.

To reactivate your account, please pay the pending commission at:
${reactivateUrl}

Thank you,
RoomRent Team`
}
