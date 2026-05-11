import { NextResponse, type NextRequest } from "next/server";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  USER_COOKIE,
  accessCookieOptions,
  isAccessTokenUsable,
  refreshCookieOptions,
  serializeUser,
  userCookieOptions,
} from "@/lib/auth/session";
import { config as runtimeConfig } from "@/lib/config";
import type { AuthResponse } from "@/lib/api/types";

const protectedPrefixes = ["/dashboard"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  const hasUsableAccessToken = isAccessTokenUsable(accessToken);
  const isProtectedRoute = protectedPrefixes.some((prefix) =>
    pathname.startsWith(prefix),
  );

  if (pathname === "/login" && hasUsableAccessToken) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (isProtectedRoute && hasUsableAccessToken) {
    return NextResponse.next();
  }

  if ((isProtectedRoute || pathname === "/login") && refreshToken) {
    const auth = await refreshConsoleSession(refreshToken);

    if (auth) {
      const response =
        pathname === "/login"
          ? NextResponse.redirect(new URL("/dashboard", request.url))
          : nextWithSessionCookies(request, auth);
      setSessionCookies(response, auth);
      return response;
    }
  }

  if (isProtectedRoute) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    const response = NextResponse.redirect(loginUrl);
    clearSessionCookies(response);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/dashboard/:path*"],
};

async function refreshConsoleSession(sessionValue: string) {
  try {
    const response = await fetch(
      `${runtimeConfig.apiBaseUrl}/admin/auth/refresh`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({ sessionValue }),
        cache: "no-store",
      },
    );

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as AuthResponse;
  } catch {
    return null;
  }
}

function nextWithSessionCookies(request: NextRequest, auth: AuthResponse) {
  const headers = new Headers(request.headers);
  headers.set("cookie", buildRequestCookieHeader(request, auth));

  return NextResponse.next({
    request: {
      headers,
    },
  });
}

function buildRequestCookieHeader(request: NextRequest, auth: AuthResponse) {
  const cookieValues = new Map(
    request.cookies.getAll().map((cookie) => [cookie.name, cookie.value]),
  );
  cookieValues.set(ACCESS_COOKIE, auth.accessToken);
  cookieValues.set(REFRESH_COOKIE, auth.sessionValue);
  cookieValues.set(USER_COOKIE, serializeUser(auth.user));

  return Array.from(cookieValues.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}

function setSessionCookies(response: NextResponse, auth: AuthResponse) {
  response.cookies.set(ACCESS_COOKIE, auth.accessToken, accessCookieOptions);
  response.cookies.set(REFRESH_COOKIE, auth.sessionValue, refreshCookieOptions);
  response.cookies.set(
    USER_COOKIE,
    serializeUser(auth.user),
    userCookieOptions,
  );
}

function clearSessionCookies(response: NextResponse) {
  response.cookies.delete(ACCESS_COOKIE);
  response.cookies.delete(REFRESH_COOKIE);
  response.cookies.delete(USER_COOKIE);
}
