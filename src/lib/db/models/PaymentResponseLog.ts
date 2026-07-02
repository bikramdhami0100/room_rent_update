import mongoose, { Schema, Document, Model } from "mongoose"

export interface IPaymentResponseLogDocument extends Document {
  method: "khalti" | "esewa" | "qrcode"
  endpoint: string
  requestPayload: Record<string, unknown>
  responseBody: Record<string, unknown>
  statusCode: number
  transactionId?: string
  paymentId?: mongoose.Types.ObjectId
  userId?: mongoose.Types.ObjectId
  isSuccess: boolean
}

const PaymentResponseLogSchema = new Schema<IPaymentResponseLogDocument>(
  {
    method: {
      type: String,
      enum: ["khalti", "esewa", "qrcode"],
      required: true,
    },
    endpoint: { type: String, required: true },
    requestPayload: { type: Schema.Types.Mixed, default: {} },
    responseBody: { type: Schema.Types.Mixed, default: {} },
    statusCode: { type: Number, required: true },
    transactionId: { type: String },
    paymentId: { type: Schema.Types.ObjectId, ref: "Payment" },
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    isSuccess: { type: Boolean, default: false },
  },
  { timestamps: true }
)

const PaymentResponseLog: Model<IPaymentResponseLogDocument> =
  (mongoose.models?.PaymentResponseLog as Model<IPaymentResponseLogDocument>) ||
  mongoose.model<IPaymentResponseLogDocument>("PaymentResponseLog", PaymentResponseLogSchema)

export default PaymentResponseLog
