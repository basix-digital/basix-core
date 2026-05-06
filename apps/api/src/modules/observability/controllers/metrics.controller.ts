import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { JwtAdminUser } from "../../common/context/request-context.types";
import { JwtAdminGuard } from "../../common/guards/jwt-admin.guard";
import { TenantMetricsParamsDto } from "../dto/tenant-metrics-params.dto";
import { TenantMetricsQueryDto } from "../dto/tenant-metrics-query.dto";
import { UsageMetricsService } from "../services/usage-metrics.service";

@Controller("admin/metrics")
@UseGuards(JwtAdminGuard)
export class MetricsController {
  constructor(private readonly usageMetricsService: UsageMetricsService) {}

  @Get("tenant/:tenantId")
  async getTenantMetrics(
    @CurrentUser() user: JwtAdminUser,
    @Param() params: TenantMetricsParamsDto,
    @Query() query: TenantMetricsQueryDto,
  ) {
    return this.usageMetricsService.getTenantMetrics(
      user.id,
      params.tenantId,
      query,
    );
  }
}
