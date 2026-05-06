import { Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { ObservabilityModule } from "../observability/observability.module";
import { PlanEnforcementInterceptor } from "./interceptors/plan-enforcement.interceptor";
import { RateLimitService } from "./services/rate-limit.service";

@Module({
  imports: [ObservabilityModule],
  providers: [
    RateLimitService,
    {
      provide: APP_INTERCEPTOR,
      useClass: PlanEnforcementInterceptor,
    },
  ],
})
export class EnforcementModule {}
