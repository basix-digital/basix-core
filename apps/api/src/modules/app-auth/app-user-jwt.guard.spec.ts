import { ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import { AppUserJwtGuard } from "./app-user-jwt.guard";

describe("AppUserJwtGuard", () => {
  const jwtServiceMock = {
    verifyAsync: jest.fn(),
  };
  const prismaMock = {
    appUser: {
      findFirst: jest.fn(),
    },
  };
  const configServiceMock = {
    getOrThrow: jest.fn(() => "jwt-secret"),
  };

  function createContext(request: Record<string, unknown>) {
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as ExecutionContext;
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("attaches active app-user context from a valid JWT", async () => {
    const request = {
      headers: {
        authorization: "Bearer access-token",
      },
    };
    jwtServiceMock.verifyAsync.mockResolvedValue({
      typ: "app_user",
      sub: "app-user-id",
      email: "user@example.com",
      tenantId: "tenant-id",
      appId: "app-id",
      scopes: ["crm:read"],
    });
    prismaMock.appUser.findFirst.mockResolvedValue({
      id: "app-user-id",
      email: "user@example.com",
      name: "User",
      tenantId: "tenant-id",
      appId: "app-id",
      scopes: ["crm:read"],
    });

    const guard = new AppUserJwtGuard(
      jwtServiceMock as unknown as JwtService,
      prismaMock as unknown as PrismaService,
      configServiceMock as unknown as ConfigService,
    );

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);

    expect(prismaMock.appUser.findFirst).toHaveBeenCalledWith({
      where: expect.objectContaining({
        id: "app-user-id",
        status: "active",
        tenant: { status: "active" },
        app: { status: "active" },
      }),
      select: expect.any(Object),
    });
    expect(request).toMatchObject({
      appUser: {
        id: "app-user-id",
        tenantId: "tenant-id",
        appId: "app-id",
        scopes: ["crm:read"],
      },
      tenantId: "tenant-id",
      appId: "app-id",
      apiTokenScopes: ["crm:read"],
    });
  });

  it("rejects tokens without the app_user token type", async () => {
    const request = {
      headers: {
        authorization: "Bearer access-token",
      },
    };
    jwtServiceMock.verifyAsync.mockResolvedValue({
      sub: "admin-user-id",
      email: "admin@example.com",
    });

    const guard = new AppUserJwtGuard(
      jwtServiceMock as unknown as JwtService,
      prismaMock as unknown as PrismaService,
      configServiceMock as unknown as ConfigService,
    );

    await expect(
      guard.canActivate(createContext(request)),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prismaMock.appUser.findFirst).not.toHaveBeenCalled();
  });
});
