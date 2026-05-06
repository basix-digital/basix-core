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
      update: jest.fn(),
    },
  };

  let service: TenantContextService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TenantContextService(prismaMock as unknown as PrismaService);
  });

  it("resolves tenant context from a valid API token", async () => {
    prismaMock.apiToken.findUnique.mockResolvedValue({
      id: "token-id",
      tenantId: "tenant-id",
      appId: "app-id",
      tokenHash: "hash",
      status: "active",
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
});
