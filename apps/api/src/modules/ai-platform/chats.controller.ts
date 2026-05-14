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
import { AiPlatformService } from "./ai-platform.service";
import {
  ChatListQueryDto,
  ChatQueryDto,
  ManualMessageDto,
  TakeoverDto,
} from "./dto/ai-platform.dto";

@Controller("chats")
@UseGuards(JwtAdminGuard)
export class ChatsController {
  constructor(private readonly aiPlatform: AiPlatformService) {}

  @Get()
  list(@CurrentUser() user: JwtAdminUser, @Query() query: ChatListQueryDto) {
    return this.aiPlatform.listChats(user.id, query);
  }

  @Get(":phone")
  get(
    @CurrentUser() user: JwtAdminUser,
    @Param("phone") phone: string,
    @Query() query: ChatQueryDto,
  ) {
    return this.aiPlatform.getChat(user.id, phone, query);
  }

  @Post(":phone/takeover")
  takeover(
    @CurrentUser() user: JwtAdminUser,
    @Param("phone") phone: string,
    @Body() body: TakeoverDto,
  ) {
    return this.aiPlatform.takeoverChat(user.id, phone, body);
  }

  @Post(":phone/release")
  release(
    @CurrentUser() user: JwtAdminUser,
    @Param("phone") phone: string,
    @Body() body: TakeoverDto,
  ) {
    return this.aiPlatform.releaseChat(user.id, phone, body);
  }

  @Post(":phone/messages")
  sendManualMessage(
    @CurrentUser() user: JwtAdminUser,
    @Param("phone") phone: string,
    @Body() body: ManualMessageDto,
  ) {
    return this.aiPlatform.sendManualMessage(user.id, phone, body);
  }
}
