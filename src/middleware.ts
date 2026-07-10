import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isAuth = !!req.auth;

  // 1. Protect all /admin routes (unauthenticated redirects to admin login)
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    if (!isAuth) {
      const loginUrl = new URL("/admin/login", req.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 2. Protect /dashboard routes
  if (pathname.startsWith("/dashboard")) {
    if (!isAuth) {
      const signinUrl = new URL("/api/auth/signin", req.url);
      signinUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(signinUrl);
    }
  }

  // 3. Protect /artist routes except /artist/register
  if (pathname.startsWith("/artist") && pathname !== "/artist/register") {
    if (!isAuth) {
      const signinUrl = new URL("/api/auth/signin", req.url);
      signinUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(signinUrl);
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*", "/dashboard/:path*", "/artist/:path*"],
};
