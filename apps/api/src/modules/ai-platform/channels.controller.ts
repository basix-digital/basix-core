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
  CreateChannelDto,
  TenantScopedQueryDto,
  UpdateChannelDto,
} from "./dto/ai-platform.dto";

@Controller("channels")
@UseGuards(JwtAdminGuard)
export class ChannelsController {
  constructor(private readonly aiPlatform: AiPlatformService) {}

  @Get()
  list(
    @CurrentUser() user: JwtAdminUser,
    @Query() query: TenantScopedQueryDto,
  ) {
    return this.aiPlatform.listChannels(user.id, query);
  }

  @Post()
  create(@CurrentUser() user: JwtAdminUser, @Body() body: CreateChannelDto) {
    return this.aiPlatform.createChannel(user.id, body);
  }

  @Patch(":id")
  update(
    @CurrentUser() user: JwtAdminUser,
    @Param("id") id: string,
    @Body() body: UpdateChannelDto,
  ) {
    return this.aiPlatform.updateChannel(user.id, id, body);
  }
}
