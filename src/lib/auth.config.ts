import type { NextAuthConfig } from "next-auth"

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
    newUser: "/register",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      if (nextUrl.pathname.startsWith("/api")) return true

      const isLoggedIn = !!auth?.user
      const userRole = (auth?.user as any)?.role

      const isPublicRoute =
        nextUrl.pathname === "/" ||
        nextUrl.pathname.startsWith("/search") ||
        nextUrl.pathname.startsWith("/rooms") ||
        nextUrl.pathname.startsWith("/login") ||
        nextUrl.pathname.startsWith("/register") ||
        nextUrl.pathname === "/landlord/register" ||
        nextUrl.pathname.startsWith("/forgot-password") ||
        nextUrl.pathname.startsWith("/reset-password")

      const isAdminRoute = nextUrl.pathname.startsWith("/admin")
      const isLandlordRoute = nextUrl.pathname.startsWith("/landlord") && nextUrl.pathname !== "/landlord/register"
      const isStudentRoute = nextUrl.pathname.startsWith("/student")
      const isStudentProtected = nextUrl.pathname.startsWith("/confirm") || nextUrl.pathname.startsWith("/payment")
      const isAuthRoute = nextUrl.pathname.startsWith("/login") || nextUrl.pathname.startsWith("/register") || nextUrl.pathname.startsWith("/forgot-password") || nextUrl.pathname.startsWith("/reset-password")

      if (isPublicRoute) {
        if (!isLoggedIn) return true
        if (nextUrl.pathname === "/") {
          const dashboardUrl = userRole === "admin" ? "/admin/dashboard" : userRole === "landlord" ? "/landlord/dashboard" : userRole === "student" ? "/student/dashboard" : "/"
          return Response.redirect(new URL(dashboardUrl, nextUrl))
        }
      }

      if (isAuthRoute) {
        if (isLoggedIn) return Response.redirect(new URL("/", nextUrl))
        return true
      }

      if (!isLoggedIn) {
        return Response.redirect(new URL("/login", nextUrl))
      }

      if (isAdminRoute && userRole !== "admin") {
        return Response.redirect(new URL("/", nextUrl))
      }

      if (isLandlordRoute && userRole !== "landlord") {
        return Response.redirect(new URL("/", nextUrl))
      }

      if ((isStudentRoute || isStudentProtected) && userRole !== "student") {
        return Response.redirect(new URL("/", nextUrl))
      }

      return true
    },
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
      }
      if (trigger === "update" && session) {
        token.name = session.name
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id
        ;(session.user as any).role = token.role
      }
      return session
    },
  },
  providers: [],
}
