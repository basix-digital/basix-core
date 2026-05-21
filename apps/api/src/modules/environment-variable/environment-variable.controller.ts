import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtAdminUser } from "../common/context/request-context.types";
import { JwtAdminGuard } from "../common/guards/jwt-admin.guard";
import { CreateEnvironmentVariableDto } from "./dto/create-environment-variable.dto";
import { ListEnvironmentVariablesQueryDto } from "./dto/list-environment-variables-query.dto";
import { RotateEnvironmentVariableDto } from "./dto/rotate-environment-variable.dto";
import { EnvironmentVariableService } from "./environment-variable.service";

@Controller("admin/environment-variables")
@UseGuards(JwtAdminGuard)
export class EnvironmentVariableController {
  constructor(
    private readonly environmentVariables: EnvironmentVariableService,
  ) {}

  @Get()
  list(
    @CurrentUser() user: JwtAdminUser,
    @Query() query: ListEnvironmentVariablesQueryDto,
  ) {
    return this.environmentVariables.list(user.id, query);
  }

  @Post()
  create(
    @CurrentUser() user: JwtAdminUser,
    @Body() body: CreateEnvironmentVariableDto,
  ) {
    return this.environmentVariables.create(user.id, body);
  }

  @Post(":id/rotate")
  rotate(
    @CurrentUser() user: JwtAdminUser,
    @Param("id") id: string,
    @Body() body: RotateEnvironmentVariableDto,
  ) {
    return this.environmentVariables.rotate(user.id, id, body);
  }

  @Post(":id/revoke")
  revoke(@CurrentUser() user: JwtAdminUser, @Param("id") id: string) {
    return this.environmentVariables.revoke(user.id, id);
  }
}
