import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";
import type { Prisma } from "@basix-core/database";
import * as argon2 from "argon2";
import crypto from "node:crypto";
import { TenantAccessService } from "../common/context/tenant-access.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateApiTokenDto } from "./dto/create-api-token.dto";
import { ListApiTokensQueryDto } from "./dto/list-api-tokens-query.dto";
import { RevokeApiTokenDto } from "./dto/revoke-api-token.dto";

const TOKEN_PUBLIC_PREFIX = "bxs";
const TOKEN_PREFIX_BYTES = 6;
const TOKEN_SECRET_BYTES = 32;

const apiTokenSelect = {
  id: true,
  tenantId: true,
  appId: true,
  name: true,
  prefix: true,
  scopes: true,
  status: true,
  lastUsedAt: true,
  expiresAt: true,
  revokedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class ApiTokenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantAccess: TenantAccessService,
  ) {}

  async create(userId: string, data: CreateApiTokenDto) {
    const expiresAt = this.parseExpiresAt(data.expiresAt);
    const app = await this.tenantAccess.getAccessibleApp(userId, data.appId);
    const rawToken = await this.generateUniqueRawToken();
    const tokenHash = await argon2.hash(rawToken.token);

    try {
      const apiToken = await this.prisma.$transaction(
        async (tx: Prisma.TransactionClient) => {
          const createdToken = await tx.apiToken.create({
            data: {
              tenantId: app.tenantId,
              appId: app.id,
              name: data.name || `${app.name} token`,
              prefix: rawToken.prefix,
              tokenHash,
              scopes: data.scopes ?? [],
              expiresAt,
            },
            select: apiTokenSelect,
          });

          await tx.auditLog.create({
            data: {
              tenantId: createdToken.tenantId,
              actorUserId: userId,
              action: "api_token.create",
              entity: "ApiToken",
              entityId: createdToken.id,
              metadata: {
                appId: createdToken.appId,
                name: createdToken.name,
                prefix: createdToken.prefix,
                scopes: createdToken.scopes,
                expiresAt: createdToken.expiresAt?.toISOString() ?? null,
              },
            },
          });

          return createdToken;
        },
      );

      return {
        ...apiToken,
        token: rawToken.token,
      };
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException("API token prefix already exists");
      }

      throw error;
    }
  }

  async list(userId: string, query: ListApiTokensQueryDto) {
    await this.tenantAccess.assertTenantAccess(userId, query.tenantId);
    const now = new Date();

    return this.prisma.apiToken.findMany({
      where: {
        tenantId: query.tenantId,
        ...(query.appId ? { appId: query.appId } : {}),
        ...this.statusWhere(query.status ?? "all", now),
      },
      orderBy: { createdAt: "desc" },
      select: apiTokenSelect,
    });
  }

  async revoke(userId: string, data: RevokeApiTokenDto) {
    const apiToken = await this.tenantAccess.getAccessibleApiToken(
      userId,
      data.apiTokenId,
    );
    if (apiToken.revokedAt) {
      return apiToken;
    }

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const revokedToken = await tx.apiToken.update({
        where: { id: apiToken.id },
        data: {
          status: "revoked",
          revokedAt: new Date(),
        },
        select: apiTokenSelect,
      });

      await tx.auditLog.create({
        data: {
          tenantId: revokedToken.tenantId,
          actorUserId: userId,
          action: "api_token.revoke",
          entity: "ApiToken",
          entityId: revokedToken.id,
          metadata: {
            appId: revokedToken.appId,
            prefix: revokedToken.prefix,
          },
        },
      });

      return revokedToken;
    });
  }

  private parseExpiresAt(value?: string) {
    if (!value) {
      return undefined;
    }

    const expiresAt = new Date(value);
    if (expiresAt <= new Date()) {
      throw new BadRequestException("expiresAt must be in the future");
    }

    return expiresAt;
  }

  private async generateUniqueRawToken() {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const prefix = crypto.randomBytes(TOKEN_PREFIX_BYTES).toString("hex");
      const secret = crypto.randomBytes(TOKEN_SECRET_BYTES).toString("hex");
      const existing = await this.prisma.apiToken.findUnique({
        where: { prefix },
        select: { id: true },
      });

      if (!existing) {
        return {
          prefix,
          token: `${TOKEN_PUBLIC_PREFIX}_${prefix}_${secret}`,
        };
      }
    }

    throw new InternalServerErrorException("Unable to generate API token");
  }

  private statusWhere(status: string, now: Date): Prisma.ApiTokenWhereInput {
    if (status === "active") {
      return {
        status: "active",
        revokedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      };
    }

    if (status === "revoked") {
      return {
        OR: [{ status: "revoked" }, { revokedAt: { not: null } }],
      };
    }

    if (status === "expired") {
      return {
        revokedAt: null,
        expiresAt: { lte: now },
      };
    }

    return {};
  }

  private isUniqueConstraintError(error: unknown) {
    return Boolean(
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "P2002",
    );
  }
}
