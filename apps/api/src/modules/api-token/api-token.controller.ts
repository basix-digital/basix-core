import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtAdminUser } from "../common/context/request-context.types";
import { JwtAdminGuard } from "../common/guards/jwt-admin.guard";
import { ApiTokenService } from "./api-token.service";
import { CreateApiTokenDto } from "./dto/create-api-token.dto";
import { ListApiTokensQueryDto } from "./dto/list-api-tokens-query.dto";
import { RevokeApiTokenDto } from "./dto/revoke-api-token.dto";

@Controller("admin/api-tokens")
@UseGuards(JwtAdminGuard)
export class ApiTokenController {
  constructor(private readonly apiTokenService: ApiTokenService) {}

  @Get()
  async list(
    @CurrentUser() user: JwtAdminUser,
    @Query() query: ListApiTokensQueryDto,
  ) {
    return this.apiTokenService.list(user.id, query);
  }

  @Post()
  async create(
    @CurrentUser() user: JwtAdminUser,
    @Body() body: CreateApiTokenDto,
  ) {
    return this.apiTokenService.create(user.id, body);
  }

  @Post("revoke")
  async revoke(
    @CurrentUser() user: JwtAdminUser,
    @Body() body: RevokeApiTokenDto,
  ) {
    return this.apiTokenService.revoke(user.id, body);
  }
}
