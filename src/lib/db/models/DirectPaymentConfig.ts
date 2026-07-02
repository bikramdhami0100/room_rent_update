import mongoose, { Schema, Document, Model } from "mongoose"

export interface IDirectPaymentConfigDocument extends Document {
  title: string
  description: string
  qrCodeImage: string
  isActive: boolean
}

const DirectPaymentConfigSchema = new Schema<IDirectPaymentConfigDocument>(
  {
    title: { type: String, required: true },
    description: { type: String, default: "" },
    qrCodeImage: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
)

const DirectPaymentConfig: Model<IDirectPaymentConfigDocument> =
  (mongoose.models?.DirectPaymentConfig as Model<IDirectPaymentConfigDocument>) ||
  mongoose.model<IDirectPaymentConfigDocument>("DirectPaymentConfig", DirectPaymentConfigSchema)

export default DirectPaymentConfig
