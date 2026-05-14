import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtAdminUser } from "../common/context/request-context.types";
import { JwtAdminGuard } from "../common/guards/jwt-admin.guard";
import { AiPlatformService } from "./ai-platform.service";
import { TenantScopedQueryDto } from "./dto/ai-platform.dto";

@Controller("metrics")
@UseGuards(JwtAdminGuard)
export class AiMetricsController {
  constructor(private readonly aiPlatform: AiPlatformService) {}

  @Get()
  get(@CurrentUser() user: JwtAdminUser, @Query() query: TenantScopedQueryDto) {
    return this.aiPlatform.getMetrics(user.id, query);
  }
}
