import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtAdminUser } from "../common/context/request-context.types";
import { JwtAdminGuard } from "../common/guards/jwt-admin.guard";
import { AiPlatformService } from "./ai-platform.service";
import { AgentSettingsDto, TenantScopedQueryDto } from "./dto/ai-platform.dto";

@Controller("agents")
@UseGuards(JwtAdminGuard)
export class AgentsController {
  constructor(private readonly aiPlatform: AiPlatformService) {}

  @Get()
  list(
    @CurrentUser() user: JwtAdminUser,
    @Query() query: TenantScopedQueryDto,
  ) {
    return this.aiPlatform.listAgents(user.id, query);
  }

  @Patch(":agent/llm-settings")
  updateSettings(
    @CurrentUser() user: JwtAdminUser,
    @Param("agent") agent: string,
    @Body() body: AgentSettingsDto,
  ) {
    return this.aiPlatform.upsertAgentSettings(user.id, agent, body);
  }
}
