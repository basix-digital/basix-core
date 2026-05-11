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
import { AiPlatformService } from "./ai-platform.service";
import {
  AssignPlaybookDto,
  CreatePlaybookDto,
  TenantScopedQueryDto,
  UpdatePlaybookDto,
} from "./dto/ai-platform.dto";

@Controller("playbooks")
@UseGuards(JwtAdminGuard)
export class PlaybooksController {
  constructor(private readonly aiPlatform: AiPlatformService) {}

  @Get()
  list(
    @CurrentUser() user: JwtAdminUser,
    @Query() query: TenantScopedQueryDto,
  ) {
    return this.aiPlatform.listPlaybooks(user.id, query);
  }

  @Post()
  create(@CurrentUser() user: JwtAdminUser, @Body() body: CreatePlaybookDto) {
    return this.aiPlatform.createPlaybook(user.id, body);
  }

  @Patch(":id")
  update(
    @CurrentUser() user: JwtAdminUser,
    @Param("id") id: string,
    @Body() body: UpdatePlaybookDto,
  ) {
    return this.aiPlatform.updatePlaybook(user.id, id, body);
  }

  @Post(":id/assignments")
  assign(
    @CurrentUser() user: JwtAdminUser,
    @Param("id") id: string,
    @Body() body: AssignPlaybookDto,
  ) {
    return this.aiPlatform.assignPlaybook(user.id, id, body);
  }
}
