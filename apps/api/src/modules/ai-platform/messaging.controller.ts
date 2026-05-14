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
  CreateCampaignDto,
  CreateMessageTemplateDto,
  ListCampaignsQueryDto,
  ListMessageTemplatesQueryDto,
  SendNotificationDto,
  UpdateMessageTemplateDto,
} from "./dto/ai-platform.dto";

@Controller("messaging")
@UseGuards(JwtAdminGuard)
export class MessagingController {
  constructor(private readonly aiPlatform: AiPlatformService) {}

  @Get("templates")
  listTemplates(
    @CurrentUser() user: JwtAdminUser,
    @Query() query: ListMessageTemplatesQueryDto,
  ) {
    return this.aiPlatform.listMessageTemplates(user.id, query);
  }

  @Post("templates")
  createTemplate(
    @CurrentUser() user: JwtAdminUser,
    @Body() body: CreateMessageTemplateDto,
  ) {
    return this.aiPlatform.createMessageTemplate(user.id, body);
  }

  @Patch("templates/:id")
  updateTemplate(
    @CurrentUser() user: JwtAdminUser,
    @Param("id") id: string,
    @Body() body: UpdateMessageTemplateDto,
  ) {
    return this.aiPlatform.updateMessageTemplate(user.id, id, body);
  }

  @Get("campaigns")
  listCampaigns(
    @CurrentUser() user: JwtAdminUser,
    @Query() query: ListCampaignsQueryDto,
  ) {
    return this.aiPlatform.listCampaigns(user.id, query);
  }

  @Post("campaigns")
  createCampaign(
    @CurrentUser() user: JwtAdminUser,
    @Body() body: CreateCampaignDto,
  ) {
    return this.aiPlatform.createCampaign(user.id, body);
  }

  @Post("notifications")
  sendNotification(
    @CurrentUser() user: JwtAdminUser,
    @Body() body: SendNotificationDto,
  ) {
    return this.aiPlatform.sendNotification(user.id, body);
  }
}
