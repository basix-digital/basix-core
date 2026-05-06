import { ConflictException, Injectable } from "@nestjs/common";
import { TenantRole } from "../common/constants/tenant-roles";
import { PrismaService } from "../prisma/prisma.service";
import { CreateTenantDto } from "./dto/create-tenant.dto";

const tenantSelect = {
  id: true,
  name: true,
  slug: true,
  status: true,
  plan: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class TenantService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, data: CreateTenantDto) {
    const slug = await this.createUniqueSlug(data.slug ?? data.name);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const tenant = await tx.tenant.create({
          data: {
            name: data.name.trim(),
            slug,
            plan: data.plan?.trim(),
          },
          select: tenantSelect,
        });

        await tx.tenantUser.create({
          data: {
            tenantId: tenant.id,
            userId,
            role: TenantRole.OWNER,
          },
        });

        await tx.auditLog.create({
          data: {
            tenantId: tenant.id,
            actorUserId: userId,
            action: "tenant.create",
            entity: "Tenant",
            entityId: tenant.id,
            metadata: {
              name: tenant.name,
              slug: tenant.slug,
              plan: tenant.plan,
            },
          },
        });

        return tenant;
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException("Tenant slug already exists");
      }

      throw error;
    }
  }

  async listForUser(userId: string) {
    return this.prisma.tenant.findMany({
      where: {
        users: {
          some: {
            userId,
            role: {
              in: [TenantRole.OWNER, TenantRole.ADMIN],
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      select: tenantSelect,
    });
  }

  private async createUniqueSlug(value: string) {
    const base = this.slugify(value);
    let slug = base;
    let suffix = 2;

    while (
      await this.prisma.tenant.findUnique({
        where: { slug },
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

    return slug || "tenant";
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
