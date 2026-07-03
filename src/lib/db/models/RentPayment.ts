import mongoose, { Schema, Document, Model } from "mongoose"
import type { RentPayStatus } from "@/types"

export interface IRentPaymentDocument extends Document {
  contractId: mongoose.Types.ObjectId
  studentId: mongoose.Types.ObjectId
  roomId: mongoose.Types.ObjectId
  landlordId: mongoose.Types.ObjectId
  amount: number
  month: number
  year: number
  status: RentPayStatus
  paidAt?: Date
  method: "khalti" | "esewa" | "qrcode" | "bank" | "cash"
  transactionId?: string
  screenshotUrl?: string
  notes?: string
}

const RentPaymentSchema = new Schema<IRentPaymentDocument>(
  {
    contractId: { type: Schema.Types.ObjectId, ref: "RentalContract", required: true },
    studentId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    roomId: { type: Schema.Types.ObjectId, ref: "Room", required: true },
    landlordId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true },
    month: { type: Number, required: true },
    year: { type: Number, required: true },
    status: {
      type: String,
      enum: ["paid", "unpaid", "partial"],
      default: "paid",
    },
    paidAt: { type: Date },
    method: {
      type: String,
      enum: ["khalti", "esewa", "qrcode", "bank", "cash"],
      default: "cash",
    },
    transactionId: { type: String },
    screenshotUrl: { type: String },
    notes: { type: String },
  },
  { timestamps: true }
)

RentPaymentSchema.index({ contractId: 1, year: 1, month: 1 }, { unique: true })

const RentPayment: Model<IRentPaymentDocument> =
  (mongoose.models?.RentPayment as Model<IRentPaymentDocument>) ||
  mongoose.model<IRentPaymentDocument>("RentPayment", RentPaymentSchema)

export default RentPayment
