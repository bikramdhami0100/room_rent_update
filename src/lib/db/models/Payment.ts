import mongoose, { Schema, Document, Model } from "mongoose"
import type { PaymentStatus } from "@/types"

export interface IPaymentDocument extends Document {
  confirmationId: mongoose.Types.ObjectId
  studentId: mongoose.Types.ObjectId
  roomId: mongoose.Types.ObjectId
  landlordId: mongoose.Types.ObjectId
  amount: number
  method: "khalti" | "esewa" | "qrcode" | "bank"
  status: PaymentStatus
  transactionId?: string
  paidAt?: Date
  screenshotUrl?: string
  bankId?: mongoose.Types.ObjectId
}

const PaymentSchema = new Schema<IPaymentDocument>(
  {
    confirmationId: {
      type: Schema.Types.ObjectId,
      ref: "Confirmation",
      required: true,
    },
    studentId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    roomId: { type: Schema.Types.ObjectId, ref: "Room", required: true },
    landlordId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true },
    method: {
      type: String,
      enum: ["khalti", "esewa", "qrcode", "bank"],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "paid", "overdue"],
      default: "pending",
    },
    transactionId: { type: String },
    paidAt: { type: Date },
    screenshotUrl: { type: String, default: "" },
    bankId: { type: Schema.Types.ObjectId, ref: "BankDetail" },
  },
  { timestamps: true }
)

const Payment: Model<IPaymentDocument> =
  (mongoose.models?.Payment as Model<IPaymentDocument>) ||
  mongoose.model<IPaymentDocument>("Payment", PaymentSchema)

export default Payment
