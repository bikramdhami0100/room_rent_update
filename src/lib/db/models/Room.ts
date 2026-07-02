import mongoose, { Schema, Document, Model } from "mongoose"

export interface IRoomDocument extends Document {
  landlordId: mongoose.Types.ObjectId
  title: string
  description: string
  monthlyRent: number
  location: string
  address: string
  latitude?: number
  longitude?: number
  whatsappNumber?: string
  photos: string[]
  facilities: string[]
  roomType?: string
  capacity: number
  isActive: boolean
  isApproved: boolean
}

const RoomSchema = new Schema<IRoomDocument>(
  {
    landlordId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    monthlyRent: { type: Number, required: true },
    location: { type: String, required: true },
    address: { type: String, required: true },
    latitude: { type: Number },
    longitude: { type: Number },
    whatsappNumber: { type: String },
  photos: [{ type: String }],
  facilities: [{ type: String }],
  roomType: { type: String },
  capacity: { type: Number, default: 1 },
    isActive: { type: Boolean, default: true },
    isApproved: { type: Boolean, default: false },
  },
  { timestamps: true }
)

const Room: Model<IRoomDocument> =
  (mongoose.models?.Room as Model<IRoomDocument>) || mongoose.model<IRoomDocument>("Room", RoomSchema)

export default Room
