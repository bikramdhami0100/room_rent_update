import mongoose, { Schema, Document, Model } from "mongoose"
import type { PaymentStatus } from "@/types"

export interface IConfirmationDocument extends Document {
  studentId: mongoose.Types.ObjectId
  roomId: mongoose.Types.ObjectId
  landlordId: mongoose.Types.ObjectId
  commission: number
  commissionDeadline: Date
  paymentStatus: PaymentStatus
  confirmedAt: Date
}

const ConfirmationSchema = new Schema<IConfirmationDocument>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    roomId: { type: Schema.Types.ObjectId, ref: "Room", required: true },
    landlordId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    commission: { type: Number, required: true },
    commissionDeadline: { type: Date, required: true },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "overdue"],
      default: "pending",
    },
    confirmedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
)

const Confirmation: Model<IConfirmationDocument> =
  (mongoose.models?.Confirmation as Model<IConfirmationDocument>) ||
  mongoose.model<IConfirmationDocument>("Confirmation", ConfirmationSchema)

export default Confirmation
