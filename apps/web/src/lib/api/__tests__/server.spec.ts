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
const { backendFetch } =
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

  it("does not refresh from read-only session checks", async () => {
    cookieValues.set(USER_COOKIE, serializeUser(sessionUser));
    cookieValues.set(REFRESH_COOKIE, "forged-refresh");

    await expect(getSessionUser()).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(cookieStore.delete).not.toHaveBeenCalled();
  });

  it("rejects forged user cookies when route handlers request refresh", async () => {
    cookieValues.set(USER_COOKIE, serializeUser(sessionUser));
    cookieValues.set(REFRESH_COOKIE, "forged-refresh");
    fetchMock.mockResolvedValueOnce(
      createJsonResponse(false, { message: "Invalid session" }),
    );

    await expect(getSessionUser({ refresh: true })).resolves.toBeNull();

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

    await expect(getSessionUser({ refresh: true })).resolves.toEqual(
      refreshedUser,
    );

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

  it("does not rotate refresh tokens from backend server reads", async () => {
    cookieValues.set(USER_COOKIE, serializeUser(sessionUser));
    cookieValues.set(
      ACCESS_COOKIE,
      createJwt({ exp: Math.floor(Date.now() / 1000) - 60 }),
    );
    cookieValues.set(REFRESH_COOKIE, "valid-refresh");
    fetchMock.mockResolvedValueOnce(
      createJsonResponse(false, { message: "Unauthorized" }, 401),
    );

    await expect(backendFetch("/admin/tenants")).rejects.toMatchObject({
      status: 401,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/api/admin/tenants",
      expect.objectContaining({
        cache: "no-store",
      }),
    );
    expect(cookieStore.set).not.toHaveBeenCalled();
  });
});

function createJwt(payload: object) {
  return `header.${Buffer.from(JSON.stringify(payload)).toString(
    "base64url",
  )}.signature`;
}

function createJsonResponse(
  ok: boolean,
  body: unknown,
  status = ok ? 200 : 401,
) {
  return {
    ok,
    status,
    headers: {
      get: jest.fn((name: string) =>
        name.toLowerCase() === "content-type" ? "application/json" : null,
      ),
    },
    json: jest.fn(async () => body),
  } as unknown as Response;
}
