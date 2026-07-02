import mongoose, { Schema, Document, Model } from "mongoose"
import type { UserRole, PayoutMethod, PayoutFrequency } from "@/types"

export interface IUserDocument extends Document {
  name: string
  email: string
  password?: string
  phone?: string
  role: UserRole
  image?: string
  emailVerified?: Date
  isSuspended: boolean
  suspensionReason?: string
  commissionDue?: number
  resetToken?: string
  resetTokenExpiry?: Date
  // Landlord payout details
  payoutMethod?: PayoutMethod
  payoutAccountName?: string
  payoutAccountNumber?: string
  payoutBankName?: string
  payoutQrCode?: string
  payoutFrequency?: PayoutFrequency
}

const UserSchema = new Schema<IUserDocument>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String },
    phone: { type: String },
    role: {
      type: String,
      enum: ["student", "landlord", "admin"],
      default: "student",
    },
    image: { type: String },
    emailVerified: { type: Date },
    isSuspended: { type: Boolean, default: false },
    suspensionReason: { type: String },
    commissionDue: { type: Number, default: 0 },
    resetToken: { type: String },
    resetTokenExpiry: { type: Date },
    // Landlord payout details
    payoutMethod: { type: String, enum: ["bank", "esewa", "khalti", "qrcode"] },
    payoutAccountName: { type: String },
    payoutAccountNumber: { type: String },
    payoutBankName: { type: String },
    payoutQrCode: { type: String },
    payoutFrequency: {
      type: String,
      enum: ["weekly", "monthly", "thrice_monthly", "half_yearly", "yearly"],
    },
  },
  { timestamps: true }
)

const User: Model<IUserDocument> =
  (mongoose.models?.User as Model<IUserDocument>) || mongoose.model<IUserDocument>("User", UserSchema)

export default User
