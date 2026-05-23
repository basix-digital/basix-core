import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import type { Prisma } from "@basix-core/database";
import crypto from "node:crypto";
import { TenantAccessService } from "../common/context/tenant-access.service";
import { PrismaService } from "../prisma/prisma.service";
import { VaultService } from "../vault/vault.service";
import { CreateProviderCredentialDto } from "./dto/create-provider-credential.dto";
import { ListProviderCredentialsQueryDto } from "./dto/list-provider-credentials-query.dto";
import { RotateProviderCredentialDto } from "./dto/rotate-provider-credential.dto";

const credentialSelect = {
  id: true,
  tenantId: true,
  provider: true,
  scopeType: true,
  scopeId: true,
  key: true,
  status: true,
  metadata: true,
  createdBy: true,
  rotatedAt: true,
  revokedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

const allowedKeys = {
  openrouter: new Set(["api_key"]),
  resend: new Set(["api_key", "sender_email", "sender_name"]),
  brevo: new Set(["api_key", "sender_email", "sender_name"]),
  twilio: new Set([
    "account_sid",
    "auth_token",
    "api_key_sid",
    "api_key_secret",
  ]),
} as const;

@Injectable()
export class ProviderCredentialService {
  private readonly logger = new Logger(ProviderCredentialService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantAccess: TenantAccessService,
    private readonly vault: VaultService,
  ) {}

  async create(userId: string, data: CreateProviderCredentialDto) {
    await this.tenantAccess.assertTenantAccess(userId, data.tenantId);
    await this.assertProviderKey(data.provider, data.key);
    await this.assertScope(data.tenantId, data.scopeType, data.scopeId);
    await this.assertNoActiveDuplicate(data);

    const vaultSecretId = await this.vault.createSecret({
      name: this.buildSecretName(data),
      secret: data.secret,
      description: `Basix Core ${data.provider}.${data.key}`,
    });

    try {
      const credential = await this.prisma.providerCredential.create({
        data: {
          tenantId: data.tenantId,
          provider: data.provider,
          scopeType: data.scopeType,
          scopeId: data.scopeId ?? null,
          key: data.key,
          vaultSecretId,
          metadata: this.toJson(data.metadata),
          createdBy: userId,
        },
        select: credentialSelect,
      });

      await this.prisma.auditLog.create({
        data: {
          tenantId: credential.tenantId,
          actorUserId: userId,
          action: "provider_credential.create",
          entity: "ProviderCredential",
          entityId: credential.id,
          metadata: {
            provider: credential.provider,
            key: credential.key,
            scopeType: credential.scopeType,
            scopeId: credential.scopeId,
          },
        },
      });

      return credential;
    } catch (error) {
      await this.deleteCreatedVaultSecret(vaultSecretId);
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException("Provider credential already exists");
      }
      throw error;
    }
  }

  async list(userId: string, query: ListProviderCredentialsQueryDto) {
    await this.tenantAccess.assertTenantAccess(userId, query.tenantId);

    return this.prisma.providerCredential.findMany({
      where: {
        tenantId: query.tenantId,
        ...(query.provider ? { provider: query.provider } : {}),
      },
      orderBy: { updatedAt: "desc" },
      select: credentialSelect,
    });
  }

  async rotate(
    userId: string,
    credentialId: string,
    data: RotateProviderCredentialDto,
  ) {
    const credential = await this.getAccessibleCredential(userId, credentialId);

    await this.vault.updateSecret({
      vaultSecretId: credential.vaultSecretId,
      name: this.buildSecretName(credential),
      secret: data.secret,
      description: `Basix Core ${credential.provider}.${credential.key}`,
    });

    const updated = await this.prisma.providerCredential.update({
      where: { id: credential.id },
      data: {
        metadata:
          data.metadata !== undefined
            ? this.toJson(data.metadata)
            : credential.metadata === null
              ? undefined
              : credential.metadata,
        rotatedAt: new Date(),
      },
      select: credentialSelect,
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId: updated.tenantId,
        actorUserId: userId,
        action: "provider_credential.rotate",
        entity: "ProviderCredential",
        entityId: updated.id,
        metadata: {
          provider: updated.provider,
          key: updated.key,
          scopeType: updated.scopeType,
          scopeId: updated.scopeId,
        },
      },
    });

    return updated;
  }

  async revoke(userId: string, credentialId: string) {
    const credential = await this.getAccessibleCredential(userId, credentialId);

    const revoked = await this.prisma.providerCredential.update({
      where: { id: credential.id },
      data: {
        status: "revoked",
        revokedAt: new Date(),
      },
      select: credentialSelect,
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId: revoked.tenantId,
        actorUserId: userId,
        action: "provider_credential.revoke",
        entity: "ProviderCredential",
        entityId: revoked.id,
        metadata: {
          provider: revoked.provider,
          key: revoked.key,
          scopeType: revoked.scopeType,
          scopeId: revoked.scopeId,
        },
      },
    });

    return revoked;
  }

  private async getAccessibleCredential(userId: string, credentialId: string) {
    const credential = await this.prisma.providerCredential.findUnique({
      where: { id: credentialId },
    });

    if (!credential) {
      throw new NotFoundException("Provider credential not found");
    }

    await this.tenantAccess.assertTenantAccess(userId, credential.tenantId);
    return credential;
  }

  private async assertNoActiveDuplicate(data: {
    tenantId: string;
    provider: string;
    scopeType: string;
    scopeId?: string | null;
    key: string;
  }) {
    const existing = await this.prisma.providerCredential.findFirst({
      where: {
        tenantId: data.tenantId,
        provider: data.provider,
        scopeType: data.scopeType,
        scopeId: data.scopeId ?? null,
        key: data.key,
        status: "active",
      },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException("Provider credential already exists");
    }
  }

  private async assertScope(
    tenantId: string,
    scopeType: string,
    scopeId?: string,
  ) {
    if (scopeType === "tenant") {
      if (scopeId) {
        throw new BadRequestException(
          "Tenant-scoped credentials cannot include scopeId",
        );
      }
      return;
    }

    if (scopeType !== "channel") {
      throw new BadRequestException("Unsupported credential scope");
    }

    if (!scopeId) {
      throw new BadRequestException(
        "Channel-scoped credentials require scopeId",
      );
    }

    const channel = await this.prisma.aiChannel.findFirst({
      where: { id: scopeId, tenantId },
      select: { id: true },
    });

    if (!channel) {
      throw new NotFoundException("AI channel not found for credential scope");
    }
  }

  private async assertProviderKey(provider: string, key: string) {
    const allowed = allowedKeys[provider as keyof typeof allowedKeys];
    if (!allowed?.has(key)) {
      throw new BadRequestException("Unsupported provider credential key");
    }
  }

  private buildSecretName(input: {
    id?: string;
    tenantId: string;
    provider: string;
    scopeType: string;
    scopeId?: string | null;
    key: string;
  }) {
    return [
      "tenant",
      input.tenantId,
      input.provider,
      input.scopeType,
      input.scopeId ?? "default",
      input.key,
      input.id ?? crypto.randomUUID(),
    ].join("/");
  }

  private toJson(value: Record<string, unknown> | undefined | null) {
    if (!value) {
      return undefined;
    }

    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }

  private isUniqueConstraintError(error: unknown) {
    return Boolean(
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "P2002",
    );
  }

  private async deleteCreatedVaultSecret(vaultSecretId: string) {
    try {
      await this.vault.deleteSecret(vaultSecretId);
    } catch {
      this.logger.warn(
        "Failed to delete orphaned provider credential secret after database insert failure",
      );
    }
  }
}
