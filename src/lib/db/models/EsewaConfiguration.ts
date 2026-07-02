import mongoose, { Schema, Document, Model } from "mongoose"

export interface IEsewaConfigurationDocument extends Document {
  name: string
  merchantCode: string
  secretKey: string
  paymentUrl: string
  statusUrl: string
  successUrl: string
  failureUrl: string
  isActive: boolean
}

const EsewaConfigurationSchema = new Schema<IEsewaConfigurationDocument>(
  {
    name: { type: String, required: true },
    merchantCode: { type: String, required: true },
    secretKey: { type: String, required: true },
    paymentUrl: { type: String, required: true },
    statusUrl: { type: String, required: true },
    successUrl: { type: String, required: true },
    failureUrl: { type: String, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
)

const EsewaConfiguration: Model<IEsewaConfigurationDocument> =
  (mongoose.models?.EsewaConfiguration as Model<IEsewaConfigurationDocument>) ||
  mongoose.model<IEsewaConfigurationDocument>("EsewaConfiguration", EsewaConfigurationSchema)

export default EsewaConfiguration
