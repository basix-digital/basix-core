import { ConflictException, ForbiddenException } from "@nestjs/common";
import { TenantAccessService } from "../common/context/tenant-access.service";
import { PrismaService } from "../prisma/prisma.service";
import { VaultService } from "../vault/vault.service";
import { ProviderCredentialService } from "./provider-credential.service";

describe("ProviderCredentialService", () => {
  const prismaMock = {
    aiChannel: {
      findFirst: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    providerCredential: {
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

  let service: ProviderCredentialService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProviderCredentialService(
      prismaMock as unknown as PrismaService,
      tenantAccessMock as unknown as TenantAccessService,
      vaultMock as unknown as VaultService,
    );
  });

  it("does not create credentials when admin has no tenant access", async () => {
    tenantAccessMock.assertTenantAccess.mockRejectedValue(
      new ForbiddenException("Tenant access denied"),
    );

    await expect(
      service.create("user-id", {
        tenantId: "tenant-id",
        provider: "openrouter",
        scopeType: "tenant",
        key: "api_key",
        secret: "secret-value",
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(vaultMock.createSecret).not.toHaveBeenCalled();
    expect(prismaMock.providerCredential.create).not.toHaveBeenCalled();
  });

  it("stores only a vault reference and returns no secret material", async () => {
    tenantAccessMock.assertTenantAccess.mockResolvedValue(undefined);
    prismaMock.providerCredential.findFirst.mockResolvedValue(null);
    vaultMock.createSecret.mockResolvedValue("vault-id");
    prismaMock.providerCredential.create.mockResolvedValue({
      id: "credential-id",
      tenantId: "tenant-id",
      provider: "openrouter",
      scopeType: "tenant",
      scopeId: null,
      key: "api_key",
      status: "active",
      metadata: null,
      createdBy: "user-id",
      rotatedAt: null,
      revokedAt: null,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    const result = await service.create("user-id", {
      tenantId: "tenant-id",
      provider: "openrouter",
      scopeType: "tenant",
      key: "api_key",
      secret: "secret-value",
    });

    expect(vaultMock.createSecret).toHaveBeenCalledWith({
      name: expect.stringMatching(
        /^tenant\/tenant-id\/openrouter\/tenant\/default\/api_key\/[0-9a-f-]{36}$/,
      ),
      secret: "secret-value",
      description: "Basix Core openrouter.api_key",
    });
    expect(prismaMock.providerCredential.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: "tenant-id",
        provider: "openrouter",
        key: "api_key",
        vaultSecretId: "vault-id",
      }),
      select: expect.not.objectContaining({ vaultSecretId: true }),
    });
    expect(result).not.toHaveProperty("secret");
    expect(result).not.toHaveProperty("vaultSecretId");
  });

  it("stores Resend sender credentials", async () => {
    tenantAccessMock.assertTenantAccess.mockResolvedValue(undefined);
    prismaMock.providerCredential.findFirst.mockResolvedValue(null);
    vaultMock.createSecret.mockResolvedValue("vault-id");
    prismaMock.providerCredential.create.mockResolvedValue({
      id: "credential-id",
      tenantId: "tenant-id",
      provider: "resend",
      scopeType: "tenant",
      scopeId: null,
      key: "api_key",
      status: "active",
      metadata: null,
      createdBy: "user-id",
      rotatedAt: null,
      revokedAt: null,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    await service.create("user-id", {
      tenantId: "tenant-id",
      provider: "resend",
      scopeType: "tenant",
      key: "api_key",
      secret: "secret-value",
    });

    expect(vaultMock.createSecret).toHaveBeenCalledWith({
      name: expect.stringMatching(
        /^tenant\/tenant-id\/resend\/tenant\/default\/api_key\/[0-9a-f-]{36}$/,
      ),
      secret: "secret-value",
      description: "Basix Core resend.api_key",
    });
  });

  it("stores Sent.dm API key credentials", async () => {
    tenantAccessMock.assertTenantAccess.mockResolvedValue(undefined);
    prismaMock.providerCredential.findFirst.mockResolvedValue(null);
    vaultMock.createSecret.mockResolvedValue("vault-id");
    prismaMock.providerCredential.create.mockResolvedValue({
      id: "credential-id",
      tenantId: "tenant-id",
      provider: "sent_dm",
      scopeType: "tenant",
      scopeId: null,
      key: "api_key",
      status: "active",
      metadata: null,
      createdBy: "user-id",
      rotatedAt: null,
      revokedAt: null,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    await service.create("user-id", {
      tenantId: "tenant-id",
      provider: "sent_dm",
      scopeType: "tenant",
      key: "api_key",
      secret: "secret-value",
    });

    expect(vaultMock.createSecret).toHaveBeenCalledWith({
      name: expect.stringMatching(
        /^tenant\/tenant-id\/sent_dm\/tenant\/default\/api_key\/[0-9a-f-]{36}$/,
      ),
      secret: "secret-value",
      description: "Basix Core sent_dm.api_key",
    });
  });

  it("rotates the vault secret without exposing the vault id in the response", async () => {
    prismaMock.providerCredential.findUnique.mockResolvedValue({
      id: "credential-id",
      tenantId: "tenant-id",
      provider: "brevo",
      scopeType: "tenant",
      scopeId: null,
      key: "api_key",
      vaultSecretId: "vault-id",
      metadata: null,
    });
    tenantAccessMock.assertTenantAccess.mockResolvedValue(undefined);
    prismaMock.providerCredential.update.mockResolvedValue({
      id: "credential-id",
      tenantId: "tenant-id",
      provider: "brevo",
      scopeType: "tenant",
      scopeId: null,
      key: "api_key",
      status: "active",
      metadata: null,
      createdBy: "user-id",
      rotatedAt: new Date("2026-01-01T00:00:00.000Z"),
      revokedAt: null,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    const result = await service.rotate("user-id", "credential-id", {
      secret: "new-secret",
    });

    expect(vaultMock.updateSecret).toHaveBeenCalledWith({
      vaultSecretId: "vault-id",
      name: "tenant/tenant-id/brevo/tenant/default/api_key/credential-id",
      secret: "new-secret",
      description: "Basix Core brevo.api_key",
    });
    expect(result).not.toHaveProperty("secret");
    expect(result).not.toHaveProperty("vaultSecretId");
  });

  it("deletes the created vault secret when credential insert loses a race", async () => {
    tenantAccessMock.assertTenantAccess.mockResolvedValue(undefined);
    prismaMock.providerCredential.findFirst.mockResolvedValue(null);
    vaultMock.createSecret.mockResolvedValue("vault-id");
    vaultMock.deleteSecret.mockResolvedValue(undefined);
    prismaMock.providerCredential.create.mockRejectedValue({
      code: "P2002",
    });

    await expect(
      service.create("user-id", {
        tenantId: "tenant-id",
        provider: "twilio",
        scopeType: "tenant",
        key: "auth_token",
        secret: "secret-value",
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(vaultMock.deleteSecret).toHaveBeenCalledWith("vault-id");
  });
});
