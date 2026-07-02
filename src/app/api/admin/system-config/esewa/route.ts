import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db/connect"
import EsewaConfiguration from "@/lib/db/models/EsewaConfiguration"
import { getToken } from "next-auth/jwt"

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req: req as any, secret: process.env.AUTH_SECRET })
    if (!token || token.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const search = searchParams.get("search")
    const statusFilter = searchParams.get("status")
    const sortBy = searchParams.get("sortBy") || "createdAt"
    const sortOrder = searchParams.get("sortOrder") || "desc"
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")))
    const skip = (page - 1) * limit

    await connectDB()

    const filter: Record<string, unknown> = {}
    if (statusFilter && statusFilter !== "all") {
      filter.isActive = statusFilter === "active"
    }

    if (search) {
      const regex = { $regex: search, $options: "i" }
      filter.$or = [
        { name: regex },
        { merchantCode: regex },
      ]
    }

    const sort: Record<string, 1 | -1> = { [sortBy]: sortOrder === "asc" ? 1 : -1 }

    const [items, total] = await Promise.all([
      EsewaConfiguration.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      EsewaConfiguration.countDocuments(filter),
    ])

    return NextResponse.json({
      items,
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
    const { name, merchantCode, secretKey, paymentUrl, statusUrl, successUrl, failureUrl, isActive } = body

    if (!name || !merchantCode || !secretKey || !paymentUrl || !statusUrl || !successUrl || !failureUrl) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    await connectDB()

    const item = await EsewaConfiguration.create({
      name,
      merchantCode,
      secretKey,
      paymentUrl,
      statusUrl,
      successUrl,
      failureUrl,
      isActive: isActive ?? true,
    })

    return NextResponse.json({ item }, { status: 201 })
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
    const { _id, name, merchantCode, secretKey, paymentUrl, statusUrl, successUrl, failureUrl, isActive } = body

    if (!_id) {
      return NextResponse.json({ error: "Missing _id" }, { status: 400 })
    }

    await connectDB()

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (merchantCode !== undefined) updateData.merchantCode = merchantCode
    if (secretKey !== undefined) updateData.secretKey = secretKey
    if (paymentUrl !== undefined) updateData.paymentUrl = paymentUrl
    if (statusUrl !== undefined) updateData.statusUrl = statusUrl
    if (successUrl !== undefined) updateData.successUrl = successUrl
    if (failureUrl !== undefined) updateData.failureUrl = failureUrl
    if (isActive !== undefined) updateData.isActive = isActive

    const item = await EsewaConfiguration.findByIdAndUpdate(_id, updateData, { new: true })

    if (!item) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    return NextResponse.json({ item })
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
      return NextResponse.json({ error: "Missing id" }, { status: 400 })
    }

    await connectDB()
    await EsewaConfiguration.findByIdAndDelete(id)

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
