import { NextResponse, type NextRequest } from "next/server";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  isAccessTokenUsable,
} from "@/lib/auth/session";

const protectedPrefixes = ["/dashboard"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  const hasSession = isAccessTokenUsable(accessToken) || Boolean(refreshToken);

  if (pathname === "/login" && isAccessTokenUsable(accessToken)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (
    protectedPrefixes.some((prefix) => pathname.startsWith(prefix)) &&
    !hasSession
  ) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/dashboard/:path*"],
};
