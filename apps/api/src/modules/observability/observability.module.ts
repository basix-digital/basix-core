import { Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { CommonModule } from "../common/common.module";
import { PrismaModule } from "../prisma/prisma.module";
import { MetricsController } from "./controllers/metrics.controller";
import { ApiEventInterceptor } from "./interceptors/api-event.interceptor";
import { ApiEventRecorderService } from "./services/api-event-recorder.service";
import { PlanLimitService } from "./services/plan-limit.service";
import { UsageMetricsService } from "./services/usage-metrics.service";

@Module({
  imports: [CommonModule, PrismaModule],
  controllers: [MetricsController],
  providers: [
    ApiEventRecorderService,
    PlanLimitService,
    UsageMetricsService,
    {
      provide: APP_INTERCEPTOR,
      useClass: ApiEventInterceptor,
    },
  ],
  exports: [ApiEventRecorderService, PlanLimitService, UsageMetricsService],
})
export class ObservabilityModule {}
