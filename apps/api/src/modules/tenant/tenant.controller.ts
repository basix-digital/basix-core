import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtAdminUser } from "../common/context/request-context.types";
import { JwtAdminGuard } from "../common/guards/jwt-admin.guard";
import { CreateTenantDto } from "./dto/create-tenant.dto";
import { UpdateTenantEmailProviderDto } from "./dto/update-tenant-email-provider.dto";
import { TenantService } from "./tenant.service";

@Controller("admin/tenants")
@UseGuards(JwtAdminGuard)
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Post()
  async create(
    @CurrentUser() user: JwtAdminUser,
    @Body() body: CreateTenantDto,
  ) {
    return this.tenantService.create(user.id, body);
  }

  @Get()
  async list(@CurrentUser() user: JwtAdminUser) {
    return this.tenantService.listForUser(user.id);
  }

  @Post(":tenantId/transactional-email-provider")
  async updateTransactionalEmailProvider(
    @CurrentUser() user: JwtAdminUser,
    @Param("tenantId") tenantId: string,
    @Body() body: UpdateTenantEmailProviderDto,
  ) {
    return this.tenantService.updateTransactionalEmailProvider(
      user.id,
      tenantId,
      body.transactionalEmailProvider,
    );
  }
}
