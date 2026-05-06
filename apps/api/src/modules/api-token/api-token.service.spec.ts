import { BadRequestException } from "@nestjs/common";
import * as argon2 from "argon2";
import { TenantAccessService } from "../common/context/tenant-access.service";
import { PrismaService } from "../prisma/prisma.service";
import { ApiTokenService } from "./api-token.service";

jest.mock("argon2", () => ({
  hash: jest.fn(),
}));

describe("ApiTokenService", () => {
  const prismaMock = {
    $transaction: jest.fn(),
    apiToken: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  };

  const tenantAccessMock = {
    getAccessibleApp: jest.fn(),
    getAccessibleApiToken: jest.fn(),
  };

  let service: ApiTokenService;

  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.$transaction.mockImplementation((callback) =>
      callback(prismaMock),
    );
    service = new ApiTokenService(
      prismaMock as unknown as PrismaService,
      tenantAccessMock as unknown as TenantAccessService,
    );
  });

  it("creates an app-bound token and returns the raw token only once", async () => {
    tenantAccessMock.getAccessibleApp.mockResolvedValue({
      id: "app-id",
      tenantId: "tenant-id",
      name: "Billing",
    });
    prismaMock.apiToken.findUnique.mockResolvedValue(null);
    jest.mocked(argon2.hash).mockResolvedValue("hashed-token");
    prismaMock.apiToken.create.mockResolvedValue({
      id: "token-id",
      tenantId: "tenant-id",
      appId: "app-id",
      name: "Billing token",
      prefix: "prefix",
      scopes: [],
      status: "active",
      lastUsedAt: null,
      expiresAt: null,
      revokedAt: null,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    const result = await service.create("user-id", { appId: "app-id" });

    expect(result.token).toMatch(/^bxs_[a-f0-9]{12}_[a-f0-9]{64}$/);
    expect(result).not.toHaveProperty("tokenHash");
    expect(argon2.hash).toHaveBeenCalledWith(result.token);
    expect(prismaMock.apiToken.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: "tenant-id",
        appId: "app-id",
        tokenHash: "hashed-token",
        scopes: [],
      }),
      select: expect.not.objectContaining({ tokenHash: true }),
    });
    expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: "tenant-id",
        actorUserId: "user-id",
        action: "api_token.create",
        entity: "ApiToken",
        entityId: "token-id",
      }),
    });
  });

  it("rejects expired creation requests", async () => {
    tenantAccessMock.getAccessibleApp.mockResolvedValue({
      id: "app-id",
      tenantId: "tenant-id",
      name: "Billing",
    });

    await expect(
      service.create("user-id", {
        appId: "app-id",
        expiresAt: "2020-01-01T00:00:00.000Z",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prismaMock.apiToken.create).not.toHaveBeenCalled();
  });

  it("revokes only tokens accessible to the admin user", async () => {
    tenantAccessMock.getAccessibleApiToken.mockResolvedValue({
      id: "token-id",
      tenantId: "tenant-id",
      appId: "app-id",
      revokedAt: null,
    });
    prismaMock.apiToken.update.mockResolvedValue({
      id: "token-id",
      tenantId: "tenant-id",
      appId: "app-id",
      status: "revoked",
      revokedAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    await service.revoke("user-id", { apiTokenId: "token-id" });

    expect(tenantAccessMock.getAccessibleApiToken).toHaveBeenCalledWith(
      "user-id",
      "token-id",
    );
    expect(prismaMock.apiToken.update).toHaveBeenCalledWith({
      where: { id: "token-id" },
      data: expect.objectContaining({
        status: "revoked",
        revokedAt: expect.any(Date),
      }),
      select: expect.not.objectContaining({ tokenHash: true }),
    });
    expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: "tenant-id",
        actorUserId: "user-id",
        action: "api_token.revoke",
        entity: "ApiToken",
        entityId: "token-id",
      }),
    });
  });
});
