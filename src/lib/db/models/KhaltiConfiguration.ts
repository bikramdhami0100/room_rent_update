import mongoose, { Schema, Document, Model } from "mongoose"

export interface IKhaltiConfigurationDocument extends Document {
  name: string
  secretKey: string
  initiateUrl: string
  lookupUrl: string
  merchantCode: string
  isActive: boolean
}

const KhaltiConfigurationSchema = new Schema<IKhaltiConfigurationDocument>(
  {
    name: { type: String, required: true },
    secretKey: { type: String, required: true },
    initiateUrl: { type: String, required: true },
    lookupUrl: { type: String, required: true },
    merchantCode: { type: String, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
)

const KhaltiConfiguration: Model<IKhaltiConfigurationDocument> =
  (mongoose.models?.KhaltiConfiguration as Model<IKhaltiConfigurationDocument>) ||
  mongoose.model<IKhaltiConfigurationDocument>("KhaltiConfiguration", KhaltiConfigurationSchema)

export default KhaltiConfiguration
