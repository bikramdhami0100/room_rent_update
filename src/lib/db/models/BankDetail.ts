import mongoose, { Schema, Document, Model } from "mongoose"

export interface IBankDetailDocument extends Document {
  bankName: string
  accountHolderName: string
  accountNumber: string
  branch: string
  qrCodeImage: string
  isActive: boolean
}

const BankDetailSchema = new Schema<IBankDetailDocument>(
  {
    bankName: { type: String, required: true },
    accountHolderName: { type: String, required: true },
    accountNumber: { type: String, required: true },
    branch: { type: String, default: "" },
    qrCodeImage: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
)

const BankDetail: Model<IBankDetailDocument> =
  (mongoose.models?.BankDetail as Model<IBankDetailDocument>) ||
  mongoose.model<IBankDetailDocument>("BankDetail", BankDetailSchema)

export default BankDetail
