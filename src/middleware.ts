import { auth } from "@/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const isAuthPage = req.nextUrl.pathname.startsWith("/login")
  const isApiRoute = req.nextUrl.pathname.startsWith("/api")

  // Logged-in users on the login page → redirect to dashboard
  if (isAuthPage) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL("/", req.nextUrl))
    }
    return
  }

  // Unauthenticated users on protected routes → redirect to login
  if (!isLoggedIn && !isApiRoute) {
    return NextResponse.redirect(new URL("/login", req.nextUrl))
  }
})

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
}
