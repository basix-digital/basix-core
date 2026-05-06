import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { TenantAccessService } from "../../common/context/tenant-access.service";
import { PrismaService } from "../../prisma/prisma.service";
import { PlanLimitService } from "./plan-limit.service";
import { UsageMetricsService } from "./usage-metrics.service";

describe("UsageMetricsService", () => {
  const prismaMock = {
    apiEvent: {
      aggregate: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    app: {
      findMany: jest.fn(),
    },
    apiToken: {
      findMany: jest.fn(),
    },
    usageMetric: {
      upsert: jest.fn(),
    },
    $queryRaw: jest.fn(),
    $transaction: jest.fn(),
  };
  const tenantAccessMock = {
    assertTenantAccess: jest.fn(),
  };
  const planLimitMock = {
    validateTenantRequestQuota: jest.fn(),
  };

  let service: UsageMetricsService;

  beforeEach(() => {
    jest.resetAllMocks();
    prismaMock.apiEvent.count
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(2);
    prismaMock.apiEvent.aggregate.mockResolvedValue({
      _avg: { durationMs: 123.4 },
    });
    prismaMock.apiEvent.groupBy
      .mockResolvedValueOnce([{ appId: "app-id", _count: { id: 7 } }])
      .mockResolvedValueOnce([{ tokenId: "token-id", _count: { id: 5 } }]);
    prismaMock.app.findMany.mockResolvedValue([
      { id: "app-id", name: "Billing", slug: "billing" },
    ]);
    prismaMock.apiToken.findMany.mockResolvedValue([
      {
        id: "token-id",
        appId: "app-id",
        name: "Billing token",
        prefix: "abcdef",
      },
    ]);
    prismaMock.$queryRaw.mockResolvedValue([
      {
        day: new Date("2026-05-01T00:00:00.000Z"),
        requestCount: 10,
        errorCount: 2,
        averageLatencyMs: 123.4,
      },
    ]);
    planLimitMock.validateTenantRequestQuota.mockResolvedValue({
      plan: "Starter",
      monthlyRequestLimit: 10_000,
      currentMonthlyRequests: 10,
      remainingRequests: 9_990,
      quotaExceeded: false,
      warningThresholdReached: false,
      warningThreshold: 0.8,
    });
    prismaMock.usageMetric.upsert.mockImplementation((args) => args);
    prismaMock.$transaction.mockResolvedValue([]);

    service = new UsageMetricsService(
      prismaMock as unknown as PrismaService,
      tenantAccessMock as unknown as TenantAccessService,
      planLimitMock as unknown as PlanLimitService,
    );
  });

  it("returns tenant-scoped metrics without exposing token hashes", async () => {
    await expect(
      service.getTenantMetrics("user-id", "tenant-id", {
        from: "2026-05-01T00:00:00.000Z",
        to: "2026-05-06T00:00:00.000Z",
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        tenantId: "tenant-id",
        totalRequests: 10,
        errorRate: 0.2,
        averageLatencyMs: 123,
        topApps: [
          {
            appId: "app-id",
            name: "Billing",
            slug: "billing",
            requestCount: 7,
          },
        ],
        topTokens: [
          {
            tokenId: "token-id",
            appId: "app-id",
            name: "Billing token",
            prefix: "abcdef",
            requestCount: 5,
          },
        ],
      }),
    );

    expect(tenantAccessMock.assertTenantAccess).toHaveBeenCalledWith(
      "user-id",
      "tenant-id",
    );
    expect(prismaMock.apiToken.findMany).toHaveBeenCalledWith({
      where: {
        tenantId: "tenant-id",
        id: { in: ["token-id"] },
      },
      select: {
        id: true,
        appId: true,
        name: true,
        prefix: true,
      },
    });
  });

  it("does not query metrics when tenant access is denied", async () => {
    tenantAccessMock.assertTenantAccess.mockRejectedValue(
      new ForbiddenException("Tenant access denied"),
    );

    await expect(
      service.getTenantMetrics("user-id", "tenant-id", {}),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prismaMock.apiEvent.count).not.toHaveBeenCalled();
  });

  it("rejects metrics ranges larger than 90 days", async () => {
    await expect(
      service.getTenantMetrics("user-id", "tenant-id", {
        from: "2026-01-01T00:00:00.000Z",
        to: "2026-05-01T00:00:00.000Z",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prismaMock.apiEvent.count).not.toHaveBeenCalled();
  });

  it("upserts daily usage metrics using a deterministic period key", async () => {
    await expect(
      service.persistDailyUsageMetrics(
        "tenant-id",
        new Date("2026-05-06T12:00:00.000Z"),
      ),
    ).resolves.toEqual({
      tenantId: "tenant-id",
      day: "2026-05-06",
      totalRequests: 10,
      errorRequests: 2,
      averageLatencyMs: 123,
    });

    expect(prismaMock.usageMetric.upsert).toHaveBeenCalledTimes(3);
    expect(prismaMock.usageMetric.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          tenantId_metricName_source_periodStart: {
            tenantId: "tenant-id",
            metricName: "requests_per_day",
            source: "api_event_aggregator",
            periodStart: new Date("2026-05-06T00:00:00.000Z"),
          },
        },
        update: {
          metricValue: 10,
          metadata: { day: "2026-05-06" },
        },
        create: expect.objectContaining({
          tenantId: "tenant-id",
          metricName: "requests_per_day",
          metricValue: 10,
          source: "api_event_aggregator",
          periodStart: new Date("2026-05-06T00:00:00.000Z"),
        }),
      }),
    );
    expect(prismaMock.$transaction).toHaveBeenCalledWith([
      expect.any(Object),
      expect.any(Object),
      expect.any(Object),
    ]);
  });
});
