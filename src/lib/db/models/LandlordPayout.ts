import mongoose, { Schema, Document, Model } from "mongoose"
import type { PayoutFrequency, PayoutStatus } from "@/types"

export interface ILandlordPayoutDocument extends Document {
  landlordId: mongoose.Types.ObjectId
  amount: number
  frequency: PayoutFrequency
  status: PayoutStatus
  paidAt?: Date
  adminId?: mongoose.Types.ObjectId
  note?: string
}

const LandlordPayoutSchema = new Schema<ILandlordPayoutDocument>(
  {
    landlordId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true },
    frequency: {
      type: String,
      enum: ["weekly", "monthly", "thrice_monthly", "half_yearly", "yearly"],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "paid", "cancelled"],
      default: "pending",
    },
    paidAt: { type: Date },
    adminId: { type: Schema.Types.ObjectId, ref: "User" },
    note: { type: String },
  },
  { timestamps: true }
)

const LandlordPayout: Model<ILandlordPayoutDocument> =
  (mongoose.models?.LandlordPayout as Model<ILandlordPayoutDocument>) ||
  mongoose.model<ILandlordPayoutDocument>("LandlordPayout", LandlordPayoutSchema)

export default LandlordPayout
