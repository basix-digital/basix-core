import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtAdminUser } from "../common/context/request-context.types";
import { JwtAdminGuard } from "../common/guards/jwt-admin.guard";
import { AiPlatformService } from "./ai-platform.service";
import { QueueListQueryDto } from "./dto/ai-platform.dto";

@Controller("queue")
@UseGuards(JwtAdminGuard)
export class QueueController {
  constructor(private readonly aiPlatform: AiPlatformService) {}

  @Get()
  list(@CurrentUser() user: JwtAdminUser, @Query() query: QueueListQueryDto) {
    return this.aiPlatform.listQueue(user.id, query);
  }
}
