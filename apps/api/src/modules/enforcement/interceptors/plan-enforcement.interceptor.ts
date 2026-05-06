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
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (!request.tenantId || !request.appId || !request.apiTokenId) {
      return next.handle();
    }

    const decisions = this.rateLimitService.evaluate({
      tenantId: request.tenantId,
      appId: request.appId,
      apiTokenId: request.apiTokenId,
    });

    const deniedDecision = decisions.find((decision) => !decision.allowed);
    if (deniedDecision) {
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
