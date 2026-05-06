import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

interface PlanDefinition {
  name: string;
  monthlyRequestLimit: number | null;
  warningThreshold: number;
}

export interface PlanLimitReport {
  plan: string;
  monthlyRequestLimit: number | null;
  currentMonthlyRequests: number;
  remainingRequests: number | null;
  quotaExceeded: boolean;
  warningThresholdReached: boolean;
  warningThreshold: number;
}

const PLAN_LIMITS: Record<string, PlanDefinition> = {
  starter: {
    name: "Starter",
    monthlyRequestLimit: 10_000,
    warningThreshold: 0.8,
  },
  pro: {
    name: "Pro",
    monthlyRequestLimit: 100_000,
    warningThreshold: 0.8,
  },
  enterprise: {
    name: "Enterprise",
    monthlyRequestLimit: null,
    warningThreshold: 0.8,
  },
  internal: {
    name: "Internal",
    monthlyRequestLimit: null,
    warningThreshold: 0.8,
  },
};

@Injectable()
export class PlanLimitService {
  constructor(private readonly prisma: PrismaService) {}

  async validateTenantRequestQuota(
    tenantId: string,
    now = new Date(),
  ): Promise<PlanLimitReport> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        plan: true,
      },
    });

    if (!tenant) {
      throw new NotFoundException("Tenant not found");
    }

    const currentMonthlyRequests = await this.prisma.apiEvent.count({
      where: {
        tenantId,
        createdAt: {
          gte: this.getMonthStart(now),
          lt: this.getNextMonthStart(now),
        },
      },
    });

    return this.evaluatePlanUsage(tenant.plan, currentMonthlyRequests);
  }

  evaluatePlanUsage(
    tenantPlan: string | null,
    currentMonthlyRequests: number,
  ): PlanLimitReport {
    const plan = this.resolvePlan(tenantPlan);
    const monthlyRequestLimit = plan.monthlyRequestLimit;
    const quotaExceeded =
      monthlyRequestLimit !== null &&
      currentMonthlyRequests >= monthlyRequestLimit;
    const warningThresholdReached =
      monthlyRequestLimit !== null &&
      currentMonthlyRequests >= monthlyRequestLimit * plan.warningThreshold;

    return {
      plan: plan.name,
      monthlyRequestLimit,
      currentMonthlyRequests,
      remainingRequests:
        monthlyRequestLimit === null
          ? null
          : Math.max(0, monthlyRequestLimit - currentMonthlyRequests),
      quotaExceeded,
      warningThresholdReached,
      warningThreshold: plan.warningThreshold,
    };
  }

  private resolvePlan(tenantPlan: string | null) {
    return (
      PLAN_LIMITS[(tenantPlan ?? "starter").toLowerCase()] ??
      PLAN_LIMITS.starter
    );
  }

  private getMonthStart(date: Date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  }

  private getNextMonthStart(date: Date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
  }
}
