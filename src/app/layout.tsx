import type { Metadata } from "next"
import { cookies } from "next/headers"
import { Providers } from "./providers"
import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import "./globals.css"

export const metadata: Metadata = {
  title: "RoomRent - Find Your Perfect Room",
  description: "Room rental platform in Nepal - Search, book, and pay for rooms",
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const locale = cookieStore.get("NEXT_LOCALE")?.value === "np" ? "ne" : "en"
  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="min-h-screen flex flex-col antialiased">
        <Providers>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  )
}
