import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  TooManyRequestsException,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { AuthenticatedRequest } from "../../common/context/request-context.types";
import { PlanLimitService } from "../../observability/services/plan-limit.service";
import { RateLimitService } from "../services/rate-limit.service";

@Injectable()
export class PlanEnforcementInterceptor implements NestInterceptor {
  constructor(
    private readonly rateLimitService: RateLimitService,
    private readonly planLimitService: PlanLimitService,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const http = context.switchToHttp();
    const request = http.getRequest<AuthenticatedRequest>();
    const response = http.getResponse();

    if (!request.tenantId || !request.appId || !request.apiTokenId) {
      return next.handle();
    }

    const decisions = this.rateLimitService.evaluate({
      tenantId: request.tenantId,
      appId: request.appId,
      apiTokenId: request.apiTokenId,
    });

    const primaryDecision = decisions.find(
      (decision) => decision.dimension === "token",
    );

    if (primaryDecision) {
      response.setHeader("X-RateLimit-Limit", primaryDecision.limit ?? "unlimited");
      response.setHeader(
        "X-RateLimit-Remaining",
        primaryDecision.remaining ?? "unlimited",
      );
      response.setHeader(
        "X-RateLimit-Reset",
        primaryDecision.resetAt.toISOString(),
      );
    }

    const deniedDecision = decisions.find((decision) => !decision.allowed);
    if (deniedDecision) {
      response.setHeader("Retry-After", deniedDecision.retryAfterSeconds);

      throw new TooManyRequestsException({
        message: `rate limit exceeded for ${deniedDecision.dimension}`,
        dimension: deniedDecision.dimension,
        retryAfterSeconds: deniedDecision.retryAfterSeconds,
        remaining: deniedDecision.remaining,
      });
    }

    const quota = await this.planLimitService.validateTenantRequestQuota(
      request.tenantId,
    );

    response.setHeader("X-Plan", quota.plan);

    if (quota.warningThresholdReached) {
      response.setHeader("X-Quota-Warning", "true");
    }

    if (quota.quotaExceeded) {
      throw new TooManyRequestsException({
        message: "monthly plan quota exceeded",
        plan: quota.plan,
        monthlyRequestLimit: quota.monthlyRequestLimit,
        currentMonthlyRequests: quota.currentMonthlyRequests,
      });
    }

    return next.handle();
  }
}
