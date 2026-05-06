import { ConflictException, Injectable } from "@nestjs/common";
import { TenantAccessService } from "../common/context/tenant-access.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateAppDto } from "./dto/create-app.dto";

const appSelect = {
  id: true,
  tenantId: true,
  name: true,
  slug: true,
  baseUrl: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class AppService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantAccess: TenantAccessService,
  ) {}

  async create(userId: string, data: CreateAppDto) {
    await this.tenantAccess.assertTenantAccess(userId, data.tenantId);
    const slug = await this.createUniqueSlug(
      data.tenantId,
      data.slug ?? data.name,
    );

    try {
      return await this.prisma.$transaction(async (tx) => {
        const app = await tx.app.create({
          data: {
            tenantId: data.tenantId,
            name: data.name,
            slug,
            baseUrl: data.baseUrl,
          },
          select: appSelect,
        });

        await tx.auditLog.create({
          data: {
            tenantId: app.tenantId,
            actorUserId: userId,
            action: "app.create",
            entity: "App",
            entityId: app.id,
            metadata: {
              name: app.name,
              slug: app.slug,
              baseUrl: app.baseUrl,
            },
          },
        });

        return app;
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException("App slug already exists for tenant");
      }

      throw error;
    }
  }

  async listForTenant(userId: string, tenantId: string) {
    await this.tenantAccess.assertTenantAccess(userId, tenantId);

    return this.prisma.app.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      select: appSelect,
    });
  }

  private async createUniqueSlug(tenantId: string, value: string) {
    const base = this.slugify(value);
    let slug = base;
    let suffix = 2;

    while (
      await this.prisma.app.findUnique({
        where: {
          tenantId_slug: {
            tenantId,
            slug,
          },
        },
        select: { id: true },
      })
    ) {
      slug = `${base}-${suffix}`;
      suffix += 1;
    }

    return slug;
  }

  private slugify(value: string) {
    const slug = value
      .trim()
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    return slug || "app";
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
