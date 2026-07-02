import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { writeFile, mkdir } from "fs/promises"
import path from "path"

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req: req as any, secret: process.env.AUTH_SECRET })
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get("file") as File | null
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const uploadsDir = path.join(process.cwd(), "public", "uploads")
    await mkdir(uploadsDir, { recursive: true })

    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`
    const filePath = path.join(uploadsDir, uniqueName)
    await writeFile(filePath, buffer)

    return NextResponse.json({ url: `/uploads/${uniqueName}` })
  } catch (error) {
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}
