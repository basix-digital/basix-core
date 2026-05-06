import { PrismaService } from "../../prisma/prisma.service";
import { PlanLimitService } from "./plan-limit.service";

describe("PlanLimitService", () => {
  const prismaMock = {
    tenant: {
      findUnique: jest.fn(),
    },
    apiEvent: {
      count: jest.fn(),
    },
  };

  let service: PlanLimitService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PlanLimitService(prismaMock as unknown as PrismaService);
  });

  it("reports warning and exceeded states for fixed plans", () => {
    expect(service.evaluatePlanUsage("Starter", 8_000)).toEqual(
      expect.objectContaining({
        plan: "Starter",
        monthlyRequestLimit: 10_000,
        currentMonthlyRequests: 8_000,
        quotaExceeded: false,
        warningThresholdReached: true,
      }),
    );

    expect(service.evaluatePlanUsage("Starter", 10_000)).toEqual(
      expect.objectContaining({
        quotaExceeded: true,
        remainingRequests: 0,
      }),
    );
  });

  it("treats enterprise plans as unlimited", () => {
    expect(service.evaluatePlanUsage("Enterprise", 1_000_000)).toEqual(
      expect.objectContaining({
        plan: "Enterprise",
        monthlyRequestLimit: null,
        remainingRequests: null,
        quotaExceeded: false,
        warningThresholdReached: false,
      }),
    );
  });

  it("counts current month usage for tenant quota reporting", async () => {
    prismaMock.tenant.findUnique.mockResolvedValue({ plan: "Pro" });
    prismaMock.apiEvent.count.mockResolvedValue(50_000);

    await expect(
      service.validateTenantRequestQuota(
        "tenant-id",
        new Date("2026-05-06T12:00:00.000Z"),
      ),
    ).resolves.toEqual(
      expect.objectContaining({
        plan: "Pro",
        currentMonthlyRequests: 50_000,
      }),
    );

    expect(prismaMock.apiEvent.count).toHaveBeenCalledWith({
      where: {
        tenantId: "tenant-id",
        createdAt: {
          gte: new Date("2026-05-01T00:00:00.000Z"),
          lt: new Date("2026-06-01T00:00:00.000Z"),
        },
      },
    });
  });
});
