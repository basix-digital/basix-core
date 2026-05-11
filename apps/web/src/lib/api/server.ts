import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { config } from "@/lib/config";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  USER_COOKIE,
  accessCookieOptions,
  isAccessTokenUsable,
  parseUserCookie,
  refreshCookieOptions,
  serializeUser,
  userCookieOptions,
  type SessionUser,
} from "@/lib/auth/session";
import type { ApiEnvelopeError, AuthResponse } from "./types";
import { resolveErrorMessage } from "./errors";

type QueryValue = string | number | boolean | null | undefined;

export class BackendError extends Error {
  constructor(
    readonly status: number,
    readonly payload: ApiEnvelopeError | unknown,
  ) {
    super(resolveErrorMessage(payload));
  }
}

export function backendJson(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        message: error.issues.map((issue) => issue.message),
      },
      { status: 400 },
    );
  }

  if (error instanceof BackendError) {
    return NextResponse.json(
      {
        message: error.message,
        details: error.payload,
      },
      { status: error.status },
    );
  }

  return NextResponse.json(
    { message: "Unexpected console error" },
    { status: 500 },
  );
}

export function buildQuery(params: Record<string, QueryValue>) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value));
    }
  }

  const serialized = search.toString();
  return serialized ? `?${serialized}` : "";
}

export async function setSession(auth: AuthResponse) {
  const cookieStore = await cookies();
  cookieStore.set(ACCESS_COOKIE, auth.accessToken, accessCookieOptions);
  cookieStore.set(REFRESH_COOKIE, auth.sessionValue, refreshCookieOptions);
  cookieStore.set(USER_COOKIE, serializeUser(auth.user), userCookieOptions);
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(ACCESS_COOKIE);
  cookieStore.delete(REFRESH_COOKIE);
  cookieStore.delete(USER_COOKIE);
}

export async function getSessionUser(
  options: { refresh?: boolean } = {},
): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const user = parseUserCookie(cookieStore.get(USER_COOKIE)?.value);
  const accessToken = cookieStore.get(ACCESS_COOKIE)?.value;
  const refreshToken = cookieStore.get(REFRESH_COOKIE)?.value;

  if (!user) {
    return null;
  }

  if (isAccessTokenUsable(accessToken)) {
    return user;
  }

  if (!options.refresh) {
    return null;
  }

  if (!refreshToken) {
    return null;
  }

  const refreshedAuth = await refreshAuthSession(refreshToken);
  return refreshedAuth?.user ?? null;
}

async function refreshAuthSession(sessionValue: string) {
  const response = await fetch(`${config.apiBaseUrl}/admin/auth/refresh`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({ sessionValue }),
    cache: "no-store",
  });

  if (!response.ok) {
    await clearSession();
    return null;
  }

  const auth = (await response.json()) as AuthResponse;
  await setSession(auth);
  return auth;
}

export async function refreshSession() {
  const cookieStore = await cookies();
  const sessionValue = cookieStore.get(REFRESH_COOKIE)?.value;

  if (!sessionValue) {
    return null;
  }

  const auth = await refreshAuthSession(sessionValue);
  return auth?.accessToken ?? null;
}

export async function backendFetch<T>(
  path: string,
  init: RequestInit & { query?: Record<string, QueryValue> } = {},
): Promise<T> {
  const cookieStore = await cookies();
  const query = init.query ? buildQuery(init.query) : "";
  const accessToken = cookieStore.get(ACCESS_COOKIE)?.value;
  const token = isAccessTokenUsable(accessToken) ? accessToken : null;
  const response = await callBackend(path, query, init, token);

  return parseBackendResponse<T>(response);
}

async function callBackend(
  path: string,
  query: string,
  init: RequestInit,
  accessToken: string | null | undefined,
) {
  const headers = new Headers(init.headers);
  headers.set("accept", "application/json");

  if (init.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  if (accessToken) {
    headers.set("authorization", `Bearer ${accessToken}`);
  }

  return fetch(`${config.apiBaseUrl}${path}${query}`, {
    ...init,
    headers,
    cache: "no-store",
  });
}

async function parseBackendResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    throw new BackendError(response.status, payload);
  }

  return payload as T;
}
