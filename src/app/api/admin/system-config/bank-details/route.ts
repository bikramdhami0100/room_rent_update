import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db/connect"
import BankDetail from "@/lib/db/models/BankDetail"
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
        { bankName: regex },
        { accountHolderName: regex },
        { accountNumber: regex },
      ]
    }

    const sort: Record<string, 1 | -1> = { [sortBy]: sortOrder === "asc" ? 1 : -1 }

    const [items, total] = await Promise.all([
      BankDetail.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      BankDetail.countDocuments(filter),
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
    const { bankName, accountHolderName, accountNumber, branch, qrCodeImage, isActive } = body

    if (!bankName || !accountHolderName || !accountNumber) {
      return NextResponse.json({ error: "Missing required fields (bankName, accountHolderName, accountNumber)" }, { status: 400 })
    }

    await connectDB()

    const item = await BankDetail.create({
      bankName,
      accountHolderName,
      accountNumber,
      branch: branch || "",
      qrCodeImage: qrCodeImage || "",
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
    const { _id, bankName, accountHolderName, accountNumber, branch, qrCodeImage, isActive } = body

    if (!_id) {
      return NextResponse.json({ error: "Missing _id" }, { status: 400 })
    }

    await connectDB()

    const updateData: Record<string, unknown> = {}
    if (bankName !== undefined) updateData.bankName = bankName
    if (accountHolderName !== undefined) updateData.accountHolderName = accountHolderName
    if (accountNumber !== undefined) updateData.accountNumber = accountNumber
    if (branch !== undefined) updateData.branch = branch
    if (qrCodeImage !== undefined) updateData.qrCodeImage = qrCodeImage
    if (isActive !== undefined) updateData.isActive = isActive

    const item = await BankDetail.findByIdAndUpdate(_id, updateData, { new: true })

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
    await BankDetail.findByIdAndDelete(id)

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
