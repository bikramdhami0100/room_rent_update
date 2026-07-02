import mongoose, { Schema, Document, Model } from "mongoose"
import type { UserRole } from "@/types"

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
  },
  { timestamps: true }
)

const User: Model<IUserDocument> =
  (mongoose.models?.User as Model<IUserDocument>) || mongoose.model<IUserDocument>("User", UserSchema)

export default User
