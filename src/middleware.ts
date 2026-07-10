import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isAuth = !!req.auth;
  const role = req.auth?.user?.role;

  // 1. Protect all /admin routes except /admin/login
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    if (!isAuth || role !== "ADMIN") {
      const loginUrl = new URL("/admin/login", req.url);
      if (isAuth) {
        loginUrl.searchParams.set("error", "AccessDeniedAdminRequired");
      }
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
    if (role !== "ARTIST" && role !== "ADMIN") {
      const registerUrl = new URL("/artist/register", req.url);
      return NextResponse.redirect(registerUrl);
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*", "/dashboard/:path*", "/artist/:path*"],
};
