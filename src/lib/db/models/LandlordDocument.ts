import mongoose, { Schema, Document, Model } from "mongoose"
import type { DocumentType, VerificationStatus } from "@/types"

export interface ILandlordDocumentDocument extends Document {
  userId: mongoose.Types.ObjectId
  documentType: DocumentType
  documentUrl: string
  status: VerificationStatus
  adminComment?: string
  submittedAt?: Date | null
}

const LandlordDocumentSchema = new Schema<ILandlordDocumentDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    documentType: {
      type: String,
      enum: ["citizenship", "passport", "driving_license", "pan_card", "voter_card", "room_photos", "address"],
      required: true,
    },
    documentUrl: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    adminComment: { type: String },
    submittedAt: { type: Date, default: null },
  },
  { timestamps: true }
)

const LandlordDocument: Model<ILandlordDocumentDocument> =
  (mongoose.models?.LandlordDocument as Model<ILandlordDocumentDocument>) ||
  mongoose.model<ILandlordDocumentDocument>("LandlordDocument", LandlordDocumentSchema)

export default LandlordDocument
