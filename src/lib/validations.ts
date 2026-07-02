import { z } from "zod"

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
})

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["student", "landlord"]),
  phone: z.string().min(7, "Invalid phone number"),
})

export const landlordRegisterSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().min(7),
})

export const roomSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  monthlyRent: z.coerce.number().min(1, "Rent is required"),
  location: z.string().min(2, "Location is required"),
  address: z.string().min(5, "Address is required"),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
  whatsappNumber: z.string().optional(),
  facilities: z.string().min(1, "At least one facility required"),
  roomType: z.string().optional(),
  capacity: z.coerce.number().min(1, "Capacity must be at least 1").optional(),
})

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type RoomInput = z.infer<typeof roomSchema>
