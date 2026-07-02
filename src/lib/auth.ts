import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { authConfig } from "./auth.config"
import { connectDB } from "./db/connect"
import User from "./db/models/User"

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const { email, password } = credentials as {
          email: string
          password: string
        }

        await connectDB()
        const user = await User.findOne({ email })

        if (!user || !user.password) return null
        if (user.isSuspended) {
          const commission = user.commissionDue || 0
          throw new Error(`Your account is suspended. Please pay dues of NPR ${commission} to reactivate.`)
        }

        const isValid = await bcrypt.compare(password, user.password)
        if (!isValid) return null

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
        } as any
      },
    }),
  ],
})
