import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { PB_AUTH_COOKIE } from "@/constants/auth";

const AUTH_PATHS = ["/login", "/register"];

const DISABLE_SELF_REGISTER =
  process.env.NEXT_PUBLIC_DISABLE_SELF_REGISTER === "true";

const AUTH_BYPASS = process.env.NEXT_PUBLIC_AUTH_BYPASS === "true";

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  if (AUTH_BYPASS) {
    return NextResponse.next();
  }

  if (DISABLE_SELF_REGISTER && (path === "/register" || path.startsWith("/register/"))) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  const isAuthPath = AUTH_PATHS.some((p) => path === p || path.startsWith(`${p}/`));
  const token = req.cookies.get(PB_AUTH_COOKIE)?.value;

  if (
    path.startsWith("/api/") ||
    path.startsWith("/_next") ||
    path.includes("favicon")
  ) {
    return NextResponse.next();
  }

  if (isAuthPath) {
    if (token) {
      return NextResponse.redirect(new URL("/", req.nextUrl));
    }
    return NextResponse.next();
  }

  if (!token) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
