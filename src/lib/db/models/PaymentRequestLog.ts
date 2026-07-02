import mongoose, { Schema, Document, Model } from "mongoose"

export interface IPaymentRequestLogDocument extends Document {
  method: "khalti" | "esewa" | "qrcode" | "bank"
  endpoint: string
  payload: Record<string, unknown>
  headers: Record<string, unknown>
  paymentId?: mongoose.Types.ObjectId
  userId?: mongoose.Types.ObjectId
  ipAddress?: string
  userAgent?: string
}

const PaymentRequestLogSchema = new Schema<IPaymentRequestLogDocument>(
  {
    method: {
      type: String,
      enum: ["khalti", "esewa", "qrcode", "bank"],
      required: true,
    },
    endpoint: { type: String, required: true },
    payload: { type: Schema.Types.Mixed, default: {} },
    headers: { type: Schema.Types.Mixed, default: {} },
    paymentId: { type: Schema.Types.ObjectId, ref: "Payment" },
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    ipAddress: { type: String },
    userAgent: { type: String },
  },
  { timestamps: true }
)

const PaymentRequestLog: Model<IPaymentRequestLogDocument> =
  (mongoose.models?.PaymentRequestLog as Model<IPaymentRequestLogDocument>) ||
  mongoose.model<IPaymentRequestLogDocument>("PaymentRequestLog", PaymentRequestLogSchema)

export default PaymentRequestLog
