export type UserRole = "student" | "landlord" | "admin"

export type DocumentType =
  | "citizenship"
  | "passport"
  | "driving_license"
  | "pan_card"
  | "voter_card"
  | "room_photos"
  | "address"

export type DocumentCategory = "identity" | "verification"

export type VerificationStatus =
  | "pending"
  | "approved"
  | "rejected"

export type PaymentStatus =
  | "pending"
  | "paid"
  | "overdue"

export interface IUser {
  _id: string
  name: string
  email: string
  password?: string
  phone?: string
  role: UserRole
  image?: string
  isSuspended: boolean
  suspensionReason?: string
  commissionDue?: number
  resetToken?: string
  resetTokenExpiry?: Date
  createdAt: Date
  updatedAt: Date
}

export interface ILandlordDocument {
  _id: string
  userId: string
  documentType: DocumentType
  documentUrl: string
  status: VerificationStatus
  adminComment?: string
  createdAt: Date
  updatedAt: Date
}

export interface IRoom {
  _id: string
  landlordId: string
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
  createdAt: Date
  updatedAt: Date
}

export interface IConfirmation {
  _id: string
  studentId: string
  roomId: string
  landlordId: string
  commission: number
  commissionDeadline: Date
  paymentStatus: PaymentStatus
  confirmedAt: Date
  createdAt: Date
  updatedAt: Date
}

export interface IPayment {
  _id: string
  confirmationId: string
  studentId: string
  roomId: string
  landlordId: string
  amount: number
  method: "khalti" | "esewa" | "qrcode"
  status: PaymentStatus
  transactionId?: string
  paidAt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface IAdminStats {
  totalCommission: number
  activeRooms: number
  activeStudents: number
  activeLandlords: number
  pendingVerifications: number
}

export interface IEsewaConfiguration {
  _id: string
  name: string
  merchantCode: string
  secretKey: string
  paymentUrl: string
  statusUrl: string
  successUrl: string
  failureUrl: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface IKhaltiConfiguration {
  _id: string
  name: string
  secretKey: string
  initiateUrl: string
  lookupUrl: string
  merchantCode: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface IBankDetail {
  _id: string
  bankName: string
  accountHolderName: string
  accountNumber: string
  branch: string
  qrCodeImage: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface IPaymentRequestLog {
  _id: string
  method: "khalti" | "esewa" | "qrcode"
  endpoint: string
  payload: Record<string, unknown>
  headers: Record<string, unknown>
  paymentId?: string
  userId?: string
  ipAddress?: string
  userAgent?: string
  createdAt: Date
}

export interface IPaymentResponseLog {
  _id: string
  method: "khalti" | "esewa" | "qrcode"
  endpoint: string
  requestPayload: Record<string, unknown>
  responseBody: Record<string, unknown>
  statusCode: number
  transactionId?: string
  paymentId?: string
  userId?: string
  isSuccess: boolean
  createdAt: Date
}
