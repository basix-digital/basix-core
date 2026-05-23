import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from "@nestjs/common";
import { TenantAccessService } from "../common/context/tenant-access.service";
import { PrismaService } from "../prisma/prisma.service";
import { VaultService } from "../vault/vault.service";
import { EnvironmentVariableService } from "./environment-variable.service";

describe("EnvironmentVariableService", () => {
  const prismaMock = {
    auditLog: {
      create: jest.fn(),
    },
    tenantEnvironmentVariable: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };
  const tenantAccessMock = {
    assertTenantAccess: jest.fn(),
  };
  const vaultMock = {
    createSecret: jest.fn(),
    deleteSecret: jest.fn(),
    updateSecret: jest.fn(),
  };

  let service: EnvironmentVariableService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new EnvironmentVariableService(
      prismaMock as unknown as PrismaService,
      tenantAccessMock as unknown as TenantAccessService,
      vaultMock as unknown as VaultService,
    );
  });

  it("does not create variables when admin has no tenant access", async () => {
    tenantAccessMock.assertTenantAccess.mockRejectedValue(
      new ForbiddenException("Tenant access denied"),
    );

    await expect(
      service.create("user-id", {
        tenantId: "tenant-id",
        key: "OPENROUTER_API_KEY",
        value: "secret-value",
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(vaultMock.createSecret).not.toHaveBeenCalled();
    expect(prismaMock.tenantEnvironmentVariable.create).not.toHaveBeenCalled();
  });

  it("stores only a vault reference and returns no secret material", async () => {
    tenantAccessMock.assertTenantAccess.mockResolvedValue(undefined);
    prismaMock.tenantEnvironmentVariable.findFirst.mockResolvedValue(null);
    vaultMock.createSecret.mockResolvedValue("vault-id");
    prismaMock.tenantEnvironmentVariable.create.mockResolvedValue({
      id: "variable-id",
      tenantId: "tenant-id",
      key: "OPENROUTER_API_KEY",
      description: "LLM routing",
      status: "active",
      createdBy: "user-id",
      rotatedAt: null,
      revokedAt: null,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    const result = await service.create("user-id", {
      tenantId: "tenant-id",
      key: "OPENROUTER_API_KEY",
      value: "secret-value",
      description: "LLM routing",
    });

    expect(vaultMock.createSecret).toHaveBeenCalledWith({
      name: expect.stringMatching(
        /^tenant\/tenant-id\/env\/OPENROUTER_API_KEY\/[0-9a-f-]{36}$/,
      ),
      secret: "secret-value",
      description: "Basix Core tenant env OPENROUTER_API_KEY",
    });
    expect(prismaMock.tenantEnvironmentVariable.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: "tenant-id",
        key: "OPENROUTER_API_KEY",
        vaultSecretId: "vault-id",
        description: "LLM routing",
      }),
      select: expect.not.objectContaining({ vaultSecretId: true }),
    });
    expect(result).not.toHaveProperty("value");
    expect(result).not.toHaveProperty("vaultSecretId");
  });

  it("rejects active duplicate keys before creating a vault secret", async () => {
    tenantAccessMock.assertTenantAccess.mockResolvedValue(undefined);
    prismaMock.tenantEnvironmentVariable.findFirst.mockResolvedValue({
      id: "existing-variable-id",
    });

    await expect(
      service.create("user-id", {
        tenantId: "tenant-id",
        key: "BREVO_API_KEY",
        value: "secret-value",
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(vaultMock.createSecret).not.toHaveBeenCalled();
  });

  it("deletes the created vault secret when variable insert loses a race", async () => {
    tenantAccessMock.assertTenantAccess.mockResolvedValue(undefined);
    prismaMock.tenantEnvironmentVariable.findFirst.mockResolvedValue(null);
    vaultMock.createSecret.mockResolvedValue("vault-id");
    vaultMock.deleteSecret.mockResolvedValue(undefined);
    prismaMock.tenantEnvironmentVariable.create.mockRejectedValue({
      code: "P2002",
    });

    await expect(
      service.create("user-id", {
        tenantId: "tenant-id",
        key: "TWILIO_AUTH_TOKEN",
        value: "secret-value",
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(vaultMock.deleteSecret).toHaveBeenCalledWith("vault-id");
  });

  it("rotates active variables without exposing the vault id", async () => {
    prismaMock.tenantEnvironmentVariable.findUnique.mockResolvedValue({
      id: "variable-id",
      tenantId: "tenant-id",
      key: "OPENROUTER_API_KEY",
      vaultSecretId: "vault-id",
      description: null,
      status: "active",
      revokedAt: null,
    });
    tenantAccessMock.assertTenantAccess.mockResolvedValue(undefined);
    prismaMock.tenantEnvironmentVariable.update.mockResolvedValue({
      id: "variable-id",
      tenantId: "tenant-id",
      key: "OPENROUTER_API_KEY",
      description: null,
      status: "active",
      createdBy: "user-id",
      rotatedAt: new Date("2026-01-01T00:00:00.000Z"),
      revokedAt: null,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    const result = await service.rotate("user-id", "variable-id", {
      value: "new-secret",
    });

    expect(vaultMock.updateSecret).toHaveBeenCalledWith({
      vaultSecretId: "vault-id",
      name: "tenant/tenant-id/env/OPENROUTER_API_KEY/variable-id",
      secret: "new-secret",
      description: "Basix Core tenant env OPENROUTER_API_KEY",
    });
    expect(result).not.toHaveProperty("value");
    expect(result).not.toHaveProperty("vaultSecretId");
  });

  it("rejects rotation of revoked variables", async () => {
    prismaMock.tenantEnvironmentVariable.findUnique.mockResolvedValue({
      id: "variable-id",
      tenantId: "tenant-id",
      key: "OPENROUTER_API_KEY",
      vaultSecretId: "vault-id",
      status: "revoked",
      revokedAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    tenantAccessMock.assertTenantAccess.mockResolvedValue(undefined);

    await expect(
      service.rotate("user-id", "variable-id", {
        value: "new-secret",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(vaultMock.updateSecret).not.toHaveBeenCalled();
  });

  it("revokes variables idempotently", async () => {
    prismaMock.tenantEnvironmentVariable.findUnique.mockResolvedValue({
      id: "variable-id",
      tenantId: "tenant-id",
      key: "OPENROUTER_API_KEY",
      vaultSecretId: "vault-id",
      status: "active",
      revokedAt: null,
    });
    tenantAccessMock.assertTenantAccess.mockResolvedValue(undefined);
    prismaMock.tenantEnvironmentVariable.update.mockResolvedValue({
      id: "variable-id",
      tenantId: "tenant-id",
      key: "OPENROUTER_API_KEY",
      description: null,
      status: "revoked",
      createdBy: "user-id",
      rotatedAt: null,
      revokedAt: new Date("2026-01-01T00:00:00.000Z"),
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    const result = await service.revoke("user-id", "variable-id");

    expect(prismaMock.tenantEnvironmentVariable.update).toHaveBeenCalledWith({
      where: { id: "variable-id" },
      data: expect.objectContaining({
        status: "revoked",
        revokedAt: expect.any(Date),
      }),
      select: expect.not.objectContaining({ vaultSecretId: true }),
    });
    expect(result).not.toHaveProperty("vaultSecretId");
  });
});
