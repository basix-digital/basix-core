import {
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as argon2 from "argon2";
import { PrismaService } from "../prisma/prisma.service";
import { TenantAccessService } from "../common/context/tenant-access.service";
import { AppAuthEmailService } from "./app-auth-email.service";
import { AppAuthService } from "./app-auth.service";

jest.mock("argon2", () => ({
  hash: jest.fn(),
  verify: jest.fn(),
}));

describe("AppAuthService", () => {
  const app = {
    id: "app-id",
    tenantId: "tenant-id",
    name: "Portal",
    slug: "portal",
    baseUrl: "https://portal.example.com",
    tenant: {
      id: "tenant-id",
      name: "Acme",
      slug: "acme",
    },
  };
  const appUser = {
    id: "app-user-id",
    tenantId: "tenant-id",
    appId: "app-id",
    email: "user@example.com",
    name: "User",
    passwordHash: "password-hash",
    status: "active",
    emailVerifiedAt: new Date(),
    scopes: ["user"],
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const prismaMock = {
    app: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    appUser: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
    appUserRefreshSession: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    appAuthToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const jwtServiceMock = {
    signAsync: jest.fn(),
  };
  const configServiceMock = {
    getOrThrow: jest.fn((key: string) => {
      const values: Record<string, number | string> = {
        APP_AUTH_REFRESH_TTL_DAYS: 7,
        APP_AUTH_EMAIL_TOKEN_TTL_HOURS: 24,
        APP_AUTH_INVITE_TTL_DAYS: 7,
      };
      return values[key];
    }),
  };
  const tenantAccessMock = {
    assertTenantAccess: jest.fn(),
    getAccessibleApp: jest.fn(),
  };
  const emailMock = {
    assertConfigured: jest.fn(),
    send: jest.fn(),
  };

  let service: AppAuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.app.findFirst.mockResolvedValue(app);
    jest.mocked(argon2.hash).mockResolvedValue("hash");
    jest.mocked(argon2.verify).mockResolvedValue(true);
    jwtServiceMock.signAsync.mockResolvedValue("access-token");
    prismaMock.$transaction.mockResolvedValue([]);
    emailMock.assertConfigured.mockResolvedValue(undefined);
    service = new AppAuthService(
      prismaMock as unknown as PrismaService,
      jwtServiceMock as unknown as JwtService,
      configServiceMock as never,
      tenantAccessMock as unknown as TenantAccessService,
      emailMock as unknown as AppAuthEmailService,
    );
  });

  it("creates a pending app user and sends a verification email on signup", async () => {
    prismaMock.appUser.findUnique.mockResolvedValue(null);
    prismaMock.appUser.create.mockResolvedValue({ id: "app-user-id" });
    prismaMock.appAuthToken.create.mockResolvedValue({ id: "token-id" });
    emailMock.send.mockResolvedValue(undefined);

    await expect(
      service.signup(
        { tenantSlug: "acme", appSlug: "portal" },
        {
          email: "USER@example.com",
          password: "password123",
          name: "User",
        },
      ),
    ).resolves.toEqual({
      success: true,
      message:
        "If the account can receive authentication email, a link was sent.",
    });

    expect(prismaMock.appUser.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: "tenant-id",
        appId: "app-id",
        email: "user@example.com",
        status: "pending",
        scopes: ["user"],
      }),
    });
    expect(prismaMock.appAuthToken.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: "email_verification",
        email: "user@example.com",
        tokenHash: "hash",
      }),
    });
    expect(emailMock.send).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "tenant-id",
        toEmail: "user@example.com",
        html: expect.stringContaining("/auth/verify?token="),
      }),
    );
  });

  it("returns a generic email error when public signup cannot send email", async () => {
    prismaMock.appUser.findUnique.mockResolvedValue(null);
    prismaMock.appUser.create.mockResolvedValue({ id: "app-user-id" });
    prismaMock.appAuthToken.create.mockResolvedValue({ id: "token-id" });
    emailMock.send.mockRejectedValue(new Error("missing brevo"));

    await expect(
      service.signup(
        { tenantSlug: "acme", appSlug: "portal" },
        { email: "user@example.com", password: "password123" },
      ),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it("verifies email, consumes the token and returns a session", async () => {
    const tokenValue = `${"a".repeat(32)}.${"b".repeat(96)}`;
    prismaMock.appAuthToken.findUnique.mockResolvedValue({
      id: "token-id",
      tenantId: "tenant-id",
      appId: "app-id",
      type: "email_verification",
      tokenHash: "token-hash",
      email: "user@example.com",
      name: "User",
      scopes: ["user"],
      expiresAt: new Date(Date.now() + 60_000),
      consumedAt: null,
      revokedAt: null,
    });
    prismaMock.appAuthToken.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.appUser.update.mockResolvedValue(appUser);
    prismaMock.appUserRefreshSession.create.mockResolvedValue({
      id: "session-id",
    });

    const result = await service.verifyEmail(
      { tenantSlug: "acme", appSlug: "portal" },
      { token: tokenValue },
    );

    expect(prismaMock.appAuthToken.updateMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        id: "token-id",
        consumedAt: null,
        revokedAt: null,
      }),
      data: { consumedAt: expect.any(Date) },
    });
    expect(result).toEqual({
      accessToken: "access-token",
      sessionValue: expect.stringMatching(/^[a-f0-9]{32}\.[a-f0-9]{96}$/),
      user: {
        id: "app-user-id",
        email: "user@example.com",
        name: "User",
        tenantId: "tenant-id",
        appId: "app-id",
        scopes: ["user"],
      },
    });
  });

  it("rejects refresh replay when the session was already rotated", async () => {
    const sessionValue = `${"c".repeat(32)}.${"d".repeat(96)}`;
    prismaMock.appUserRefreshSession.findUnique.mockResolvedValue({
      id: "session-id",
      tokenHash: "session-hash",
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      appUser: {
        ...appUser,
        tenant: { status: "active" },
        app: { status: "active" },
      },
    });
    prismaMock.appUserRefreshSession.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.refresh(
        { tenantSlug: "acme", appSlug: "portal" },
        { sessionValue },
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("creates an invitation with scopes and sends an invite email", async () => {
    tenantAccessMock.getAccessibleApp.mockResolvedValue({
      id: "app-id",
      tenantId: "tenant-id",
    });
    prismaMock.app.findUnique.mockResolvedValue(app);
    prismaMock.appUser.findUnique.mockResolvedValue(null);
    prismaMock.appAuthToken.create.mockResolvedValue({ id: "invite-id" });
    prismaMock.appAuthToken.findUniqueOrThrow.mockResolvedValue({
      id: "invite-id",
      tenantId: "tenant-id",
      appId: "app-id",
      type: "invite",
      email: "user@example.com",
      name: "User",
      scopes: ["crm:read"],
      expiresAt: new Date(),
      consumedAt: null,
      revokedAt: null,
      createdByUserId: "admin-id",
      createdAt: new Date(),
    });
    emailMock.send.mockResolvedValue(undefined);

    const invitation = await service.createInvitation("admin-id", {
      tenantId: "tenant-id",
      appId: "app-id",
      email: "user@example.com",
      name: "User",
      scopes: ["crm:read"],
    });

    expect(prismaMock.appAuthToken.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: "invite",
        createdByUserId: "admin-id",
        scopes: ["crm:read"],
      }),
    });
    expect(emailMock.send).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: "You're invited to Portal",
        html: expect.stringContaining("/auth/invite?token="),
      }),
    );
    expect(invitation.id).toBe("invite-id");
  });
});
