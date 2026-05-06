import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { TenantRole, TENANT_ADMIN_ROLES } from "../constants/tenant-roles";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class TenantAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async assertTenantAccess(
    userId: string,
    tenantId: string,
    allowedRoles: readonly TenantRole[] = TENANT_ADMIN_ROLES,
  ) {
    const tenantUser = await this.prisma.tenantUser.findFirst({
      where: {
        tenantId,
        userId,
        role: { in: [...allowedRoles] },
        tenant: { status: "active" },
      },
      select: {
        tenantId: true,
        userId: true,
        role: true,
      },
    });

    if (!tenantUser) {
      throw new ForbiddenException("Tenant access denied");
    }

    return tenantUser;
  }

  async getAccessibleApp(
    userId: string,
    appId: string,
    allowedRoles: readonly TenantRole[] = TENANT_ADMIN_ROLES,
  ) {
    const app = await this.prisma.app.findFirst({
      where: {
        id: appId,
        status: "active",
        tenant: {
          status: "active",
          users: {
            some: {
              userId,
              role: { in: [...allowedRoles] },
            },
          },
        },
      },
      select: {
        id: true,
        tenantId: true,
        name: true,
        slug: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!app) {
      throw new NotFoundException("App not found");
    }

    return app;
  }

  async getAccessibleApiToken(
    userId: string,
    apiTokenId: string,
    allowedRoles: readonly TenantRole[] = TENANT_ADMIN_ROLES,
  ) {
    const token = await this.prisma.apiToken.findFirst({
      where: {
        id: apiTokenId,
        tenant: {
          status: "active",
          users: {
            some: {
              userId,
              role: { in: [...allowedRoles] },
            },
          },
        },
      },
      select: {
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
      },
    });

    if (!token) {
      throw new NotFoundException("API token not found");
    }

    return token;
  }
}
