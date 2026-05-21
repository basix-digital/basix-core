import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtAdminUser } from "../common/context/request-context.types";
import { JwtAdminGuard } from "../common/guards/jwt-admin.guard";
import { AppService } from "./app.service";
import { CreateAppDto } from "./dto/create-app.dto";
import { ListAppsQueryDto } from "./dto/list-apps-query.dto";
import { UpdateAppDto } from "./dto/update-app.dto";

@Controller("admin/apps")
@UseGuards(JwtAdminGuard)
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post()
  async create(@CurrentUser() user: JwtAdminUser, @Body() body: CreateAppDto) {
    return this.appService.create(user.id, body);
  }

  @Get()
  async list(
    @CurrentUser() user: JwtAdminUser,
    @Query() query: ListAppsQueryDto,
  ) {
    return this.appService.listForTenant(user.id, query.tenantId);
  }

  @Patch(":id")
  async update(
    @CurrentUser() user: JwtAdminUser,
    @Param("id") appId: string,
    @Body() body: UpdateAppDto,
  ) {
    return this.appService.update(user.id, appId, body);
  }
}
