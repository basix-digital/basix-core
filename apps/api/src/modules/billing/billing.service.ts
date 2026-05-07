import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

const SUPPORTED_PLANS = ["starter", "pro", "enterprise", "internal"];

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

  async reactivateTenantBilling(tenantId: string) {
    const latestSubscription = await this.prisma.subscription.findFirst({
      where: { tenantId },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!latestSubscription) {
      throw new NotFoundException("subscription not found");
    }

    await this.prisma.subscription.update({
      where: { id: latestSubscription.id },
      data: {
        status: "active",
        graceEndsAt: null,
        suspendedAt: null,
        canceledAt: null,
      },
    });

    await this.prisma.billingEvent.create({
      data: {
        tenantId,
        subscriptionId: latestSubscription.id,
        type: "subscription_reactivated",
        metadata: {
          reason: "manual_admin_action",
        },
      },
    });

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        status: "active",
      },
    });

    return {
      success: true,
      tenantId,
      subscriptionId: latestSubscription.id,
      status: "active",
    };
  }

  async changeTenantPlan(tenantId: string, plan: string) {
    const normalizedPlan =
      typeof plan === "string" ? plan.trim().toLowerCase() : "";
    if (!SUPPORTED_PLANS.includes(normalizedPlan)) {
      throw new BadRequestException("unsupported plan");
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, plan: true },
    });

    if (!tenant) {
      throw new NotFoundException("tenant not found");
    }

    const latestSubscription = await this.prisma.subscription.findFirst({
      where: { tenantId },
      orderBy: {
        createdAt: "desc",
      },
      select: { id: true, plan: true },
    });

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        plan: normalizedPlan,
      },
    });

    if (latestSubscription) {
      await this.prisma.subscription.update({
        where: { id: latestSubscription.id },
        data: {
          plan: normalizedPlan,
        },
      });
    }

    await this.prisma.billingEvent.create({
      data: {
        tenantId,
        subscriptionId: latestSubscription?.id,
        type: "subscription_plan_changed",
        metadata: {
          from: latestSubscription?.plan ?? tenant.plan,
          to: normalizedPlan,
        },
      },
    });

    return {
      success: true,
      tenantId,
      plan: normalizedPlan,
      subscriptionId: latestSubscription?.id ?? null,
    };
  }

  async markInvoiceAsPaid(invoiceId: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw new NotFoundException("invoice not found");
    }

    const paidAt = new Date();

    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: "paid",
        paidAt,
      },
    });

    await this.prisma.billingEvent.create({
      data: {
        tenantId: invoice.tenantId,
        invoiceId: invoice.id,
        subscriptionId: invoice.subscriptionId,
        type: "invoice_paid",
      },
    });

    await this.prisma.tenant.update({
      where: { id: invoice.tenantId },
      data: {
        status: "active",
      },
    });

    return {
      success: true,
      invoiceId,
      status: "paid",
    };
  }

  async processOverdueSubscriptions() {
    const now = new Date();

    const overdueSubscriptions = await this.prisma.subscription.findMany({
      where: {
        status: {
          in: ["active", "past_due"],
        },
        graceEndsAt: {
          not: null,
          lt: now,
        },
        suspendedAt: null,
      },
    });

    for (const subscription of overdueSubscriptions) {
      await this.suspendTenantBilling(subscription.tenantId);
    }

    return {
      processed: overdueSubscriptions.length,
    };
  }
}
