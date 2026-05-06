import { Injectable, UnauthorizedException } from "@nestjs/common";
import * as argon2 from "argon2";
import { PrismaService } from "../../prisma/prisma.service";
import { ApiTokenTenantContext } from "./request-context.types";

const TOKEN_PUBLIC_PREFIX = "bxs";

@Injectable()
export class TenantContextService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveFromApiToken(rawToken: string): Promise<ApiTokenTenantContext> {
    const prefix = this.extractTokenPrefix(rawToken);
    if (!prefix) {
      throw new UnauthorizedException("Invalid API token");
    }

    const token = await this.prisma.apiToken.findUnique({
      where: { prefix },
      select: {
        id: true,
        tenantId: true,
        appId: true,
        tokenHash: true,
        status: true,
        revokedAt: true,
        expiresAt: true,
        app: {
          select: {
            id: true,
            tenantId: true,
            status: true,
            tenant: {
              select: {
                id: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (
      !token ||
      token.revokedAt ||
      token.status !== "active" ||
      this.isExpired(token.expiresAt)
    ) {
      throw new UnauthorizedException("Invalid API token");
    }

    if (
      !token.app ||
      token.appId !== token.app.id ||
      token.tenantId !== token.app.tenantId ||
      token.app.status !== "active" ||
      token.app.tenant.status !== "active"
    ) {
      throw new UnauthorizedException("Invalid API token");
    }

    const valid = await argon2
      .verify(token.tokenHash, rawToken)
      .catch(() => false);
    if (!valid) {
      throw new UnauthorizedException("Invalid API token");
    }

    return {
      tenantId: token.tenantId,
      appId: token.appId,
      apiTokenId: token.id,
    };
  }

  touchApiToken(apiTokenId: string) {
    void this.prisma.apiToken
      .update({
        where: { id: apiTokenId },
        data: { lastUsedAt: new Date() },
      })
      .catch(() => undefined);
  }

  private extractTokenPrefix(rawToken: string) {
    const parts = rawToken.split("_");
    if (parts.length !== 3) {
      return null;
    }

    const [publicPrefix, prefix, secret] = parts;
    if (publicPrefix !== TOKEN_PUBLIC_PREFIX || !prefix || !secret) {
      return null;
    }

    return prefix;
  }

  private isExpired(expiresAt: Date | null) {
    return Boolean(expiresAt && expiresAt <= new Date());
  }
}
