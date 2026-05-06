import { HttpException } from "@nestjs/common";
import { of } from "rxjs";
import { PlanEnforcementInterceptor } from "./plan-enforcement.interceptor";

describe("PlanEnforcementInterceptor", () => {
  const rateLimitService = {
    evaluate: jest.fn(),
  };

  const planLimitService = {
    validateTenantRequestQuota: jest.fn(),
  };

  let interceptor: PlanEnforcementInterceptor;

  beforeEach(() => {
    jest.resetAllMocks();
    interceptor = new PlanEnforcementInterceptor(
      rateLimitService as never,
      planLimitService as never,
    );
  });

  it("skips admin routes without tenant context", async () => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({}),
        getResponse: () => ({
          setHeader: jest.fn(),
        }),
      }),
    };

    const next = {
      handle: jest.fn(() => of(true)),
    };

    await interceptor.intercept(context as never, next as never);

    expect(next.handle).toHaveBeenCalled();
    expect(rateLimitService.evaluate).not.toHaveBeenCalled();
  });

  it("throws when monthly quota is exceeded", async () => {
    rateLimitService.evaluate.mockReturnValue([
      {
        allowed: true,
        dimension: "token",
        limit: 300,
        remaining: 299,
        resetAt: new Date(),
        retryAfterSeconds: 60,
      },
    ]);

    planLimitService.validateTenantRequestQuota.mockResolvedValue({
      quotaExceeded: true,
      plan: "Starter",
      monthlyRequestLimit: 10000,
      currentMonthlyRequests: 10001,
    });

    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          tenantId: "tenant-1",
          appId: "app-1",
          apiTokenId: "token-1",
        }),
        getResponse: () => ({
          setHeader: jest.fn(),
        }),
      }),
    };

    const next = {
      handle: jest.fn(() => of(true)),
    };

    await expect(
      interceptor.intercept(context as never, next as never),
    ).rejects.toBeInstanceOf(HttpException);
  });
});
