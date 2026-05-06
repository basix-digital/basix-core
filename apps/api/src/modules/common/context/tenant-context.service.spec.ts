import { UnauthorizedException } from "@nestjs/common";
import * as argon2 from "argon2";
import { PrismaService } from "../../prisma/prisma.service";
import { TenantContextService } from "./tenant-context.service";

jest.mock("argon2", () => ({
  verify: jest.fn(),
}));

describe("TenantContextService", () => {
  const prismaMock = {
    apiToken: {
      findUnique: jest.fn(),
      updateMany: jest.fn(),
    },
  };
  const configMock = {
    get: jest.fn(),
  };

  let service: TenantContextService;

  beforeEach(() => {
    jest.clearAllMocks();
    configMock.get.mockReturnValue(300000);
    prismaMock.apiToken.updateMany.mockResolvedValue({ count: 1 });
    service = new TenantContextService(
      prismaMock as unknown as PrismaService,
      configMock as never,
    );
  });

  it("resolves tenant context from a valid API token", async () => {
    prismaMock.apiToken.findUnique.mockResolvedValue({
      id: "token-id",
      tenantId: "tenant-id",
      appId: "app-id",
      tokenHash: "hash",
      status: "active",
      scopes: ["metrics:write"],
      lastUsedAt: null,
      revokedAt: null,
      expiresAt: null,
      app: {
        id: "app-id",
        tenantId: "tenant-id",
        status: "active",
        tenant: {
          id: "tenant-id",
          status: "active",
        },
      },
    });
    jest.mocked(argon2.verify).mockResolvedValue(true);

    await expect(
      service.resolveFromApiToken("bxs_prefix_secret"),
    ).resolves.toEqual({
      tenantId: "tenant-id",
      appId: "app-id",
      apiTokenId: "token-id",
      apiTokenScopes: ["metrics:write"],
      apiTokenLastUsedAt: null,
    });
    expect(prismaMock.apiToken.findUnique).toHaveBeenCalledWith({
      where: { prefix: "prefix" },
      select: expect.any(Object),
    });
  });

  it("rejects malformed tokens without querying storage", async () => {
    await expect(service.resolveFromApiToken("invalid")).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(prismaMock.apiToken.findUnique).not.toHaveBeenCalled();
  });

  it("rejects revoked tokens before hash verification", async () => {
    prismaMock.apiToken.findUnique.mockResolvedValue({
      id: "token-id",
      tenantId: "tenant-id",
      appId: "app-id",
      tokenHash: "hash",
      status: "active",
      scopes: [],
      lastUsedAt: null,
      revokedAt: new Date(),
      expiresAt: null,
      app: null,
    });

    await expect(
      service.resolveFromApiToken("bxs_prefix_secret"),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(argon2.verify).not.toHaveBeenCalled();
  });

  it("rejects tokens whose app is bound to another tenant", async () => {
    prismaMock.apiToken.findUnique.mockResolvedValue({
      id: "token-id",
      tenantId: "tenant-id",
      appId: "app-id",
      tokenHash: "hash",
      status: "active",
      scopes: [],
      lastUsedAt: null,
      revokedAt: null,
      expiresAt: null,
      app: {
        id: "app-id",
        tenantId: "other-tenant-id",
        status: "active",
        tenant: {
          id: "other-tenant-id",
          status: "active",
        },
      },
    });

    await expect(
      service.resolveFromApiToken("bxs_prefix_secret"),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(argon2.verify).not.toHaveBeenCalled();
  });

  it("rejects expired tokens before hash verification", async () => {
    prismaMock.apiToken.findUnique.mockResolvedValue({
      id: "token-id",
      tenantId: "tenant-id",
      appId: "app-id",
      tokenHash: "hash",
      status: "active",
      scopes: [],
      lastUsedAt: null,
      revokedAt: null,
      expiresAt: new Date("2020-01-01T00:00:00.000Z"),
      app: null,
    });

    await expect(
      service.resolveFromApiToken("bxs_prefix_secret"),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(argon2.verify).not.toHaveBeenCalled();
  });

  it("skips lastUsedAt updates when the token was touched recently", () => {
    service.touchApiToken("token-id", new Date());

    expect(prismaMock.apiToken.updateMany).not.toHaveBeenCalled();
  });

  it("touches lastUsedAt only when the stored timestamp is stale", () => {
    service.touchApiToken("token-id", new Date("2020-01-01T00:00:00.000Z"));

    expect(prismaMock.apiToken.updateMany).toHaveBeenCalledWith({
      where: {
        id: "token-id",
        OR: [{ lastUsedAt: null }, { lastUsedAt: { lte: expect.any(Date) } }],
      },
      data: { lastUsedAt: expect.any(Date) },
    });
  });
});
