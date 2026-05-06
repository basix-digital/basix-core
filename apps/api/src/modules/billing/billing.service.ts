import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  async listSubscriptions() {
    return this.prisma.subscription.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });
  }

  async listInvoices() {
    return this.prisma.invoice.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });
  }

  async listBillingEvents() {
    return this.prisma.billingEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  async suspendTenantBilling(tenantId: string) {
    const activeSubscription = await this.prisma.subscription.findFirst({
      where: {
        tenantId,
        suspendedAt: null,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!activeSubscription) {
      throw new NotFoundException("active subscription not found");
    }

    const now = new Date();

    await this.prisma.subscription.update({
      where: { id: activeSubscription.id },
      data: {
        status: "suspended",
        suspendedAt: now,
      },
    });

    await this.prisma.billingEvent.create({
      data: {
        tenantId,
        subscriptionId: activeSubscription.id,
        type: "subscription_suspended",
        metadata: {
          reason: "manual_admin_action",
        },
      },
    });

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        status: "suspended",
      },
    });

    return {
      success: true,
      tenantId,
      subscriptionId: activeSubscription.id,
      status: "suspended",
    };
  }
}
