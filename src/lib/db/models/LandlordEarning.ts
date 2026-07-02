import mongoose, { Schema, Document, Model } from "mongoose"

export interface ILandlordEarningDocument extends Document {
  paymentId: mongoose.Types.ObjectId
  landlordId: mongoose.Types.ObjectId
  confirmationId: mongoose.Types.ObjectId
  studentCommission: number
  landlordShare: number
  status: "pending" | "paid"
  payoutId?: mongoose.Types.ObjectId
}

const LandlordEarningSchema = new Schema<ILandlordEarningDocument>(
  {
    paymentId: { type: Schema.Types.ObjectId, ref: "Payment", required: true },
    landlordId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    confirmationId: { type: Schema.Types.ObjectId, ref: "Confirmation", required: true },
    studentCommission: { type: Number, required: true },
    landlordShare: { type: Number, required: true },
    status: { type: String, enum: ["pending", "paid"], default: "pending" },
    payoutId: { type: Schema.Types.ObjectId, ref: "LandlordPayout" },
  },
  { timestamps: true }
)

const LandlordEarning: Model<ILandlordEarningDocument> =
  (mongoose.models?.LandlordEarning as Model<ILandlordEarningDocument>) ||
  mongoose.model<ILandlordEarningDocument>("LandlordEarning", LandlordEarningSchema)

export default LandlordEarning
