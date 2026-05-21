import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import type { Prisma } from "@basix-core/database";
import { TenantAccessService } from "../common/context/tenant-access.service";
import { PrismaService } from "../prisma/prisma.service";
import { VaultService } from "../vault/vault.service";
import { CreateEnvironmentVariableDto } from "./dto/create-environment-variable.dto";
import { ListEnvironmentVariablesQueryDto } from "./dto/list-environment-variables-query.dto";
import { RotateEnvironmentVariableDto } from "./dto/rotate-environment-variable.dto";

const environmentVariableSelect = {
  id: true,
  tenantId: true,
  key: true,
  description: true,
  status: true,
  createdBy: true,
  rotatedAt: true,
  revokedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class EnvironmentVariableService {
  private readonly logger = new Logger(EnvironmentVariableService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantAccess: TenantAccessService,
    private readonly vault: VaultService,
  ) {}

  async create(userId: string, data: CreateEnvironmentVariableDto) {
    await this.tenantAccess.assertTenantAccess(userId, data.tenantId);
    await this.assertNoActiveDuplicate(data.tenantId, data.key);

    const vaultSecretId = await this.vault.createSecret({
      name: this.buildSecretName(data),
      secret: data.value,
      description: `Basix Core tenant env ${data.key}`,
    });

    try {
      const variable = await this.prisma.tenantEnvironmentVariable.create({
        data: {
          tenantId: data.tenantId,
          key: data.key,
          vaultSecretId,
          description: this.normalizeDescription(data.description),
          createdBy: userId,
        },
        select: environmentVariableSelect,
      });

      await this.prisma.auditLog.create({
        data: {
          tenantId: variable.tenantId,
          actorUserId: userId,
          action: "environment_variable.create",
          entity: "TenantEnvironmentVariable",
          entityId: variable.id,
          metadata: {
            key: variable.key,
            description: variable.description,
          },
        },
      });

      return variable;
    } catch (error) {
      await this.deleteCreatedVaultSecret(vaultSecretId);
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException("Environment variable already exists");
      }
      throw error;
    }
  }

  async list(userId: string, query: ListEnvironmentVariablesQueryDto) {
    await this.tenantAccess.assertTenantAccess(userId, query.tenantId);

    return this.prisma.tenantEnvironmentVariable.findMany({
      where: {
        tenantId: query.tenantId,
        ...this.statusWhere(query.status ?? "all"),
        ...this.searchWhere(query.search),
      },
      orderBy: { updatedAt: "desc" },
      select: environmentVariableSelect,
    });
  }

  async rotate(
    userId: string,
    variableId: string,
    data: RotateEnvironmentVariableDto,
  ) {
    const variable = await this.getAccessibleVariable(userId, variableId);
    if (variable.status === "revoked" || variable.revokedAt) {
      throw new BadRequestException("Environment variable is revoked");
    }

    await this.vault.updateSecret({
      vaultSecretId: variable.vaultSecretId,
      name: this.buildSecretName(variable),
      secret: data.value,
      description: `Basix Core tenant env ${variable.key}`,
    });

    const updated = await this.prisma.tenantEnvironmentVariable.update({
      where: { id: variable.id },
      data: {
        rotatedAt: new Date(),
      },
      select: environmentVariableSelect,
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId: updated.tenantId,
        actorUserId: userId,
        action: "environment_variable.rotate",
        entity: "TenantEnvironmentVariable",
        entityId: updated.id,
        metadata: {
          key: updated.key,
        },
      },
    });

    return updated;
  }

  async revoke(userId: string, variableId: string) {
    const variable = await this.getAccessibleVariable(userId, variableId);
    if (variable.status === "revoked" || variable.revokedAt) {
      return this.findSafeById(variable.id);
    }

    const revoked = await this.prisma.tenantEnvironmentVariable.update({
      where: { id: variable.id },
      data: {
        status: "revoked",
        revokedAt: new Date(),
      },
      select: environmentVariableSelect,
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId: revoked.tenantId,
        actorUserId: userId,
        action: "environment_variable.revoke",
        entity: "TenantEnvironmentVariable",
        entityId: revoked.id,
        metadata: {
          key: revoked.key,
        },
      },
    });

    return revoked;
  }

  private async getAccessibleVariable(userId: string, variableId: string) {
    const variable = await this.prisma.tenantEnvironmentVariable.findUnique({
      where: { id: variableId },
    });

    if (!variable) {
      throw new NotFoundException("Environment variable not found");
    }

    await this.tenantAccess.assertTenantAccess(userId, variable.tenantId);
    return variable;
  }

  private async findSafeById(variableId: string) {
    const variable = await this.prisma.tenantEnvironmentVariable.findUnique({
      where: { id: variableId },
      select: environmentVariableSelect,
    });

    if (!variable) {
      throw new NotFoundException("Environment variable not found");
    }

    return variable;
  }

  private async assertNoActiveDuplicate(tenantId: string, key: string) {
    const existing = await this.prisma.tenantEnvironmentVariable.findFirst({
      where: {
        tenantId,
        key,
        status: "active",
      },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException("Environment variable already exists");
    }
  }

  private statusWhere(
    status: string,
  ): Prisma.TenantEnvironmentVariableWhereInput {
    if (status === "active" || status === "revoked") {
      return { status };
    }

    return {};
  }

  private searchWhere(
    search?: string,
  ): Prisma.TenantEnvironmentVariableWhereInput {
    const normalizedSearch = search?.trim().toUpperCase();
    if (!normalizedSearch) {
      return {};
    }

    return {
      key: {
        contains: normalizedSearch,
      },
    };
  }

  private buildSecretName(input: { tenantId: string; key: string }) {
    return ["tenant", input.tenantId, "env", input.key].join("/");
  }

  private normalizeDescription(value?: string) {
    const trimmed = value?.trim();
    return trimmed || null;
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
        "Failed to delete orphaned environment variable secret after database insert failure",
      );
    }
  }
}
