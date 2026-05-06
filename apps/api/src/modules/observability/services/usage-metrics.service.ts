import { BadRequestException, Injectable } from "@nestjs/common";
import { TenantAccessService } from "../../common/context/tenant-access.service";
import { PrismaService } from "../../prisma/prisma.service";
import { TenantMetricsQueryDto } from "../dto/tenant-metrics-query.dto";
import { PlanLimitService } from "./plan-limit.service";

interface MetricsRange {
  from: Date;
  to: Date;
}

interface UsageTrendRow {
  day: Date | string;
  requestCount: number;
  errorCount: number;
  averageLatencyMs: number | null;
}

const DEFAULT_METRICS_WINDOW_DAYS = 30;

@Injectable()
export class UsageMetricsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantAccess: TenantAccessService,
    private readonly planLimitService: PlanLimitService,
  ) {}

  async getTenantMetrics(
    userId: string,
    tenantId: string,
    query: TenantMetricsQueryDto,
  ) {
    await this.tenantAccess.assertTenantAccess(userId, tenantId);

    const range = this.resolveRange(query);
    const where = {
      tenantId,
      createdAt: {
        gte: range.from,
        lt: range.to,
      },
    };

    const [
      totalRequests,
      errorRequests,
      latencyAggregate,
      topApps,
      topTokens,
      usageTrend,
      plan,
    ] = await Promise.all([
      this.prisma.apiEvent.count({ where }),
      this.prisma.apiEvent.count({
        where: {
          ...where,
          statusCode: { gte: 400 },
        },
      }),
      this.prisma.apiEvent.aggregate({
        where,
        _avg: {
          durationMs: true,
        },
      }),
      this.getTopApps(tenantId, range),
      this.getTopTokens(tenantId, range),
      this.getUsageTrend(tenantId, range),
      this.planLimitService.validateTenantRequestQuota(tenantId),
    ]);

    return {
      tenantId,
      range: {
        from: range.from.toISOString(),
        to: range.to.toISOString(),
      },
      totalRequests,
      errorRate: this.calculateRate(errorRequests, totalRequests),
      averageLatencyMs: Math.round(latencyAggregate._avg.durationMs ?? 0),
      topApps,
      topTokens,
      usageTrend,
      plan,
    };
  }

  async persistDailyUsageMetrics(tenantId: string, date = new Date()) {
    const range = {
      from: this.getUtcDayStart(date),
      to: this.getNextUtcDayStart(date),
    };

    const [totalRequests, errorRequests, latencyAggregate] = await Promise.all([
      this.prisma.apiEvent.count({
        where: {
          tenantId,
          createdAt: {
            gte: range.from,
            lt: range.to,
          },
        },
      }),
      this.prisma.apiEvent.count({
        where: {
          tenantId,
          statusCode: { gte: 400 },
          createdAt: {
            gte: range.from,
            lt: range.to,
          },
        },
      }),
      this.prisma.apiEvent.aggregate({
        where: {
          tenantId,
          createdAt: {
            gte: range.from,
            lt: range.to,
          },
        },
        _avg: {
          durationMs: true,
        },
      }),
    ]);

    const averageLatencyMs = Math.round(latencyAggregate._avg.durationMs ?? 0);
    const day = range.from.toISOString().slice(0, 10);

    await this.prisma.$transaction([
      this.prisma.usageMetric.create({
        data: {
          tenantId,
          metricName: "requests_per_day",
          metricValue: totalRequests,
          source: "api_event_aggregator",
          metadata: { day },
        },
      }),
      this.prisma.usageMetric.create({
        data: {
          tenantId,
          metricName: "errors_per_day",
          metricValue: errorRequests,
          source: "api_event_aggregator",
          metadata: { day },
        },
      }),
      this.prisma.usageMetric.create({
        data: {
          tenantId,
          metricName: "avg_latency",
          metricValue: averageLatencyMs,
          source: "api_event_aggregator",
          metadata: { day },
        },
      }),
    ]);

    return {
      tenantId,
      day,
      totalRequests,
      errorRequests,
      averageLatencyMs,
    };
  }

  private async getTopApps(tenantId: string, range: MetricsRange) {
    const groupedApps = await this.prisma.apiEvent.groupBy({
      by: ["appId"],
      where: {
        tenantId,
        appId: { not: null },
        createdAt: {
          gte: range.from,
          lt: range.to,
        },
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: "desc",
        },
      },
      take: 5,
    });

    const appIds = groupedApps
      .map((app) => app.appId)
      .filter((appId): appId is string => Boolean(appId));
    const apps = await this.prisma.app.findMany({
      where: {
        tenantId,
        id: { in: appIds },
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });
    const appsById = new Map(apps.map((app) => [app.id, app]));

    return groupedApps.map((app) => ({
      appId: app.appId,
      name: app.appId ? (appsById.get(app.appId)?.name ?? null) : null,
      slug: app.appId ? (appsById.get(app.appId)?.slug ?? null) : null,
      requestCount: app._count.id,
    }));
  }

  private async getTopTokens(tenantId: string, range: MetricsRange) {
    const groupedTokens = await this.prisma.apiEvent.groupBy({
      by: ["tokenId"],
      where: {
        tenantId,
        tokenId: { not: null },
        createdAt: {
          gte: range.from,
          lt: range.to,
        },
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: "desc",
        },
      },
      take: 5,
    });

    const tokenIds = groupedTokens
      .map((token) => token.tokenId)
      .filter((tokenId): tokenId is string => Boolean(tokenId));
    const tokens = await this.prisma.apiToken.findMany({
      where: {
        tenantId,
        id: { in: tokenIds },
      },
      select: {
        id: true,
        appId: true,
        name: true,
        prefix: true,
      },
    });
    const tokensById = new Map(tokens.map((token) => [token.id, token]));

    return groupedTokens.map((token) => ({
      tokenId: token.tokenId,
      appId: token.tokenId
        ? (tokensById.get(token.tokenId)?.appId ?? null)
        : null,
      name: token.tokenId
        ? (tokensById.get(token.tokenId)?.name ?? null)
        : null,
      prefix: token.tokenId
        ? (tokensById.get(token.tokenId)?.prefix ?? null)
        : null,
      requestCount: token._count.id,
    }));
  }

  private async getUsageTrend(tenantId: string, range: MetricsRange) {
    const rows = await this.prisma.$queryRaw<UsageTrendRow[]>`
      SELECT
        date_trunc('day', "createdAt")::date AS "day",
        COUNT(*)::int AS "requestCount",
        COUNT(*) FILTER (WHERE "statusCode" >= 400)::int AS "errorCount",
        COALESCE(AVG("durationMs"), 0)::float AS "averageLatencyMs"
      FROM "ApiEvent"
      WHERE "tenantId" = ${tenantId}
        AND "createdAt" >= ${range.from}
        AND "createdAt" < ${range.to}
      GROUP BY "day"
      ORDER BY "day" ASC
    `;

    return rows.map((row) => ({
      date: new Date(row.day).toISOString().slice(0, 10),
      requestCount: Number(row.requestCount),
      errorCount: Number(row.errorCount),
      averageLatencyMs: Math.round(Number(row.averageLatencyMs ?? 0)),
    }));
  }

  private resolveRange(query: TenantMetricsQueryDto): MetricsRange {
    const to = query.to ? new Date(query.to) : new Date();
    const from = query.from
      ? new Date(query.from)
      : new Date(
          to.getTime() - DEFAULT_METRICS_WINDOW_DAYS * 24 * 60 * 60 * 1000,
        );

    if (from >= to) {
      throw new BadRequestException("from must be before to");
    }

    return { from, to };
  }

  private calculateRate(value: number, total: number) {
    if (total === 0) {
      return 0;
    }

    return Number((value / total).toFixed(4));
  }

  private getUtcDayStart(date: Date) {
    return new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    );
  }

  private getNextUtcDayStart(date: Date) {
    const start = this.getUtcDayStart(date);
    return new Date(start.getTime() + 24 * 60 * 60 * 1000);
  }
}
