import mongoose, { Schema, Document, Model } from "mongoose"
import type { RentalStatus } from "@/types"

export interface IRentalContractDocument extends Document {
  studentId: mongoose.Types.ObjectId
  roomId: mongoose.Types.ObjectId
  landlordId: mongoose.Types.ObjectId
  startDate: Date
  endDate?: Date
  monthlyRent: number
  status: RentalStatus
  terminationDate?: Date
  perDayRate?: number
}

const RentalContractSchema = new Schema<IRentalContractDocument>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    roomId: { type: Schema.Types.ObjectId, ref: "Room", required: true },
    landlordId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    monthlyRent: { type: Number, required: true },
    status: {
      type: String,
      enum: ["active", "terminated", "completed"],
      default: "active",
    },
    terminationDate: { type: Date },
    perDayRate: { type: Number },
  },
  { timestamps: true }
)

const RentalContract: Model<IRentalContractDocument> =
  (mongoose.models?.RentalContract as Model<IRentalContractDocument>) ||
  mongoose.model<IRentalContractDocument>("RentalContract", RentalContractSchema)

export default RentalContract
