import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import { TextDecoder, TextEncoder } from "node:util";

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as typeof global.TextDecoder;

const cookieValues = new Map<string, string>();
const cookieStore = {
  get: jest.fn((name: string) => {
    const value = cookieValues.get(name);
    return value ? { value } : undefined;
  }),
  set: jest.fn((name: string, value: string) => {
    cookieValues.set(name, value);
  }),
  delete: jest.fn((name: string) => {
    cookieValues.delete(name);
  }),
};

jest.mock("next/headers", () => ({
  cookies: jest.fn(async () => cookieStore),
}));

jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn((body: unknown, init?: ResponseInit) => ({ body, init })),
  },
}));

const { ACCESS_COOKIE, REFRESH_COOKIE, USER_COOKIE, serializeUser } =
  require("@/lib/auth/session") as typeof import("@/lib/auth/session");
const { getSessionUser } =
  require("@/lib/api/server") as typeof import("@/lib/api/server");

describe("server session helpers", () => {
  const sessionUser = {
    id: "user-id",
    email: "admin@basix.local",
    name: "Admin",
  };
  const fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    cookieValues.clear();
    jest.clearAllMocks();
    global.fetch = fetchMock;
  });

  it("returns the user when the access token is still usable", async () => {
    cookieValues.set(USER_COOKIE, serializeUser(sessionUser));
    cookieValues.set(
      ACCESS_COOKIE,
      createJwt({ exp: Math.floor(Date.now() / 1000) + 300 }),
    );

    await expect(getSessionUser()).resolves.toEqual(sessionUser);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not trust a user cookie with an unusable access token", async () => {
    cookieValues.set(USER_COOKIE, serializeUser(sessionUser));
    cookieValues.set(ACCESS_COOKIE, createJwt({ sub: sessionUser.id }));

    await expect(getSessionUser()).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects forged user cookies when refresh is invalid", async () => {
    cookieValues.set(USER_COOKIE, serializeUser(sessionUser));
    cookieValues.set(REFRESH_COOKIE, "forged-refresh");
    fetchMock.mockResolvedValueOnce(
      createJsonResponse(false, { message: "Invalid session" }),
    );

    await expect(getSessionUser()).resolves.toBeNull();

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/api/admin/auth/refresh",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ sessionValue: "forged-refresh" }),
      }),
    );
    expect(cookieStore.delete).toHaveBeenCalledWith(ACCESS_COOKIE);
    expect(cookieStore.delete).toHaveBeenCalledWith(REFRESH_COOKIE);
    expect(cookieStore.delete).toHaveBeenCalledWith(USER_COOKIE);
  });

  it("returns the refreshed backend user after a valid refresh", async () => {
    const refreshedUser = {
      id: "user-id",
      email: "admin@basix.local",
      name: "Admin Refreshed",
    };
    cookieValues.set(USER_COOKIE, serializeUser(sessionUser));
    cookieValues.set(
      ACCESS_COOKIE,
      createJwt({ exp: Math.floor(Date.now() / 1000) - 60 }),
    );
    cookieValues.set(REFRESH_COOKIE, "valid-refresh");
    fetchMock.mockResolvedValueOnce(
      createJsonResponse(true, {
        accessToken: "new-access-token",
        sessionValue: "new-refresh-token",
        user: refreshedUser,
      }),
    );

    await expect(getSessionUser()).resolves.toEqual(refreshedUser);

    expect(cookieStore.set).toHaveBeenCalledWith(
      ACCESS_COOKIE,
      "new-access-token",
      expect.any(Object),
    );
    expect(cookieStore.set).toHaveBeenCalledWith(
      REFRESH_COOKIE,
      "new-refresh-token",
      expect.any(Object),
    );
    expect(cookieStore.set).toHaveBeenCalledWith(
      USER_COOKIE,
      serializeUser(refreshedUser),
      expect.any(Object),
    );
  });
});

function createJwt(payload: object) {
  return `header.${Buffer.from(JSON.stringify(payload)).toString(
    "base64url",
  )}.signature`;
}

function createJsonResponse(ok: boolean, body: unknown) {
  return {
    ok,
    json: jest.fn(async () => body),
  } as unknown as Response;
}
