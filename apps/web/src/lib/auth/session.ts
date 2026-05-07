export const ACCESS_COOKIE = "basix_console_access";
export const REFRESH_COOKIE = "basix_console_refresh";
export const USER_COOKIE = "basix_console_user";

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
}

interface JwtPayload {
  exp?: number;
  sub?: string;
  email?: string;
}

const isProduction = process.env.NODE_ENV === "production";

export const accessCookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: isProduction,
  path: "/",
  maxAge: 15 * 60,
} as const;

export const refreshCookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: isProduction,
  path: "/",
  maxAge: 7 * 24 * 60 * 60,
} as const;

export const userCookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: isProduction,
  path: "/",
  maxAge: 7 * 24 * 60 * 60,
} as const;

export function parseJwtPayload(token: string): JwtPayload | null {
  const segment = token.split(".")[1];
  if (!segment) {
    return null;
  }

  try {
    const normalized = segment.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      "=",
    );

    return JSON.parse(atob(padded)) as JwtPayload;
  } catch {
    return null;
  }
}

export function isAccessTokenUsable(
  token: string | undefined,
  leewaySeconds = 30,
) {
  if (!token) {
    return false;
  }

  const payload = parseJwtPayload(token);
  if (!payload?.exp) {
    return false;
  }

  return payload.exp > Math.floor(Date.now() / 1000) + leewaySeconds;
}

export function serializeUser(user: SessionUser) {
  return encodeBase64(JSON.stringify(user));
}

export function parseUserCookie(value: string | undefined): SessionUser | null {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(decodeBase64(value)) as SessionUser;
  } catch {
    return null;
  }
}

function encodeBase64(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

function decodeBase64(value: string) {
  const binary = atob(value);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
