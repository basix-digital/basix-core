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
import { TenantContext } from "../common/decorators/tenant-context.decorator";
import { RequireScopes } from "../common/decorators/scopes.decorator";
import { ApiTokenGuard } from "../common/guards/api-token.guard";
import { ScopesGuard } from "../common/guards/scopes.guard";
import { AiPlatformActor, AiPlatformService } from "./ai-platform.service";
import {
  ApiAgentSettingsDto,
  ApiAssignPlaybookDto,
  ApiChatListQueryDto,
  ApiChatQueryDto,
  ApiCreateCampaignDto,
  ApiCreateChannelDto,
  ApiCreateContactDto,
  ApiCreateMessageTemplateDto,
  ApiCreatePlaybookDto,
  ApiListCampaignsQueryDto,
  ApiListContactsQueryDto,
  ApiListMessageTemplatesQueryDto,
  ApiManualMessageDto,
  ApiPaginatedQueryDto,
  ApiQueueListQueryDto,
  ApiSendNotificationDto,
  ApiTakeoverDto,
  ApiUpdateChannelDto,
  ApiUpdateContactDto,
  ApiUpdateMessageTemplateDto,
  ApiUpdatePlaybookDto,
} from "./dto/api-token-ai-platform.dto";

interface ApiTokenControllerContext {
  tenantId: string;
  appId: string;
  apiTokenId: string;
}

@Controller("ai")
@UseGuards(ApiTokenGuard, ScopesGuard)
export class AiPlatformApiTokenController {
  constructor(private readonly aiPlatform: AiPlatformService) {}

  @Get("crm/contacts")
  @RequireScopes("ai:crm:read")
  listContacts(
    @TenantContext() context: ApiTokenControllerContext,
    @Query() query: ApiListContactsQueryDto,
  ) {
    return this.aiPlatform.listContacts(
      this.actor(context),
      this.withTenant(context, query),
    );
  }

  @Post("crm/contacts")
  @RequireScopes("ai:crm:write")
  createContact(
    @TenantContext() context: ApiTokenControllerContext,
    @Body() body: ApiCreateContactDto,
  ) {
    return this.aiPlatform.createContact(
      this.actor(context),
      this.withTenant(context, body),
    );
  }

  @Patch("crm/contacts/:id")
  @RequireScopes("ai:crm:write")
  updateContact(
    @TenantContext() context: ApiTokenControllerContext,
    @Param("id") id: string,
    @Body() body: ApiUpdateContactDto,
  ) {
    return this.aiPlatform.updateContact(
      this.actor(context),
      id,
      this.withTenant(context, body),
    );
  }

  @Get("crm/pipelines")
  @RequireScopes("ai:crm:read")
  listPipelines(@TenantContext() context: ApiTokenControllerContext) {
    return this.aiPlatform.listPipelines(
      this.actor(context),
      this.withTenant(context, {}),
    );
  }

  @Get("activities")
  @RequireScopes("ai:activities:read")
  listActivities(
    @TenantContext() context: ApiTokenControllerContext,
    @Query() query: ApiPaginatedQueryDto,
  ) {
    return this.aiPlatform.listActivities(
      this.actor(context),
      this.withTenant(context, query),
    );
  }

  @Get("channels")
  @RequireScopes("ai:channels:read")
  listChannels(@TenantContext() context: ApiTokenControllerContext) {
    return this.aiPlatform.listChannels(
      this.actor(context),
      this.withTenant(context, {}),
    );
  }

  @Post("channels")
  @RequireScopes("ai:channels:write")
  createChannel(
    @TenantContext() context: ApiTokenControllerContext,
    @Body() body: ApiCreateChannelDto,
  ) {
    return this.aiPlatform.createChannel(
      this.actor(context),
      this.withTenant(context, body),
    );
  }

  @Patch("channels/:id")
  @RequireScopes("ai:channels:write")
  updateChannel(
    @TenantContext() context: ApiTokenControllerContext,
    @Param("id") id: string,
    @Body() body: ApiUpdateChannelDto,
  ) {
    return this.aiPlatform.updateChannel(
      this.actor(context),
      id,
      this.withTenant(context, body),
    );
  }

  @Get("chats")
  @RequireScopes("ai:chats:read")
  listChats(
    @TenantContext() context: ApiTokenControllerContext,
    @Query() query: ApiChatListQueryDto,
  ) {
    return this.aiPlatform.listChats(
      this.actor(context),
      this.withTenant(context, query),
    );
  }

  @Get("chats/:phone")
  @RequireScopes("ai:chats:read")
  getChat(
    @TenantContext() context: ApiTokenControllerContext,
    @Param("phone") phone: string,
    @Query() query: ApiChatQueryDto,
  ) {
    return this.aiPlatform.getChat(
      this.actor(context),
      phone,
      this.withTenant(context, query),
    );
  }

  @Post("chats/:phone/takeover")
  @RequireScopes("ai:chats:write")
  takeoverChat(
    @TenantContext() context: ApiTokenControllerContext,
    @Param("phone") phone: string,
    @Body() body: ApiTakeoverDto,
  ) {
    return this.aiPlatform.takeoverChat(
      this.actor(context),
      phone,
      this.withTenant(context, body),
    );
  }

  @Post("chats/:phone/release")
  @RequireScopes("ai:chats:write")
  releaseChat(
    @TenantContext() context: ApiTokenControllerContext,
    @Param("phone") phone: string,
    @Body() body: ApiTakeoverDto,
  ) {
    return this.aiPlatform.releaseChat(
      this.actor(context),
      phone,
      this.withTenant(context, body),
    );
  }

  @Post("chats/:phone/messages")
  @RequireScopes("ai:chats:write")
  sendManualMessage(
    @TenantContext() context: ApiTokenControllerContext,
    @Param("phone") phone: string,
    @Body() body: ApiManualMessageDto,
  ) {
    return this.aiPlatform.sendManualMessage(
      this.actor(context),
      phone,
      this.withTenant(context, body),
    );
  }

  @Get("agents")
  @RequireScopes("ai:agents:read")
  listAgents(@TenantContext() context: ApiTokenControllerContext) {
    return this.aiPlatform.listAgents(
      this.actor(context),
      this.withTenant(context, {}),
    );
  }

  @Patch("agents/:agent/llm-settings")
  @RequireScopes("ai:agents:write")
  updateAgentSettings(
    @TenantContext() context: ApiTokenControllerContext,
    @Param("agent") agent: string,
    @Body() body: ApiAgentSettingsDto,
  ) {
    return this.aiPlatform.upsertAgentSettings(
      this.actor(context),
      agent,
      this.withTenant(context, body),
    );
  }

  @Get("playbooks")
  @RequireScopes("ai:playbooks:read")
  listPlaybooks(@TenantContext() context: ApiTokenControllerContext) {
    return this.aiPlatform.listPlaybooks(
      this.actor(context),
      this.withTenant(context, {}),
    );
  }

  @Post("playbooks")
  @RequireScopes("ai:playbooks:write")
  createPlaybook(
    @TenantContext() context: ApiTokenControllerContext,
    @Body() body: ApiCreatePlaybookDto,
  ) {
    return this.aiPlatform.createPlaybook(
      this.actor(context),
      this.withTenant(context, body),
    );
  }

  @Patch("playbooks/:id")
  @RequireScopes("ai:playbooks:write")
  updatePlaybook(
    @TenantContext() context: ApiTokenControllerContext,
    @Param("id") id: string,
    @Body() body: ApiUpdatePlaybookDto,
  ) {
    return this.aiPlatform.updatePlaybook(
      this.actor(context),
      id,
      this.withTenant(context, body),
    );
  }

  @Post("playbooks/:id/assignments")
  @RequireScopes("ai:playbooks:write")
  assignPlaybook(
    @TenantContext() context: ApiTokenControllerContext,
    @Param("id") id: string,
    @Body() body: ApiAssignPlaybookDto,
  ) {
    return this.aiPlatform.assignPlaybook(
      this.actor(context),
      id,
      this.withTenant(context, body),
    );
  }

  @Get("message-templates")
  @RequireScopes("ai:campaigns:read")
  listMessageTemplates(
    @TenantContext() context: ApiTokenControllerContext,
    @Query() query: ApiListMessageTemplatesQueryDto,
  ) {
    return this.aiPlatform.listMessageTemplates(
      this.actor(context),
      this.withTenant(context, query),
    );
  }

  @Post("message-templates")
  @RequireScopes("ai:campaigns:write")
  createMessageTemplate(
    @TenantContext() context: ApiTokenControllerContext,
    @Body() body: ApiCreateMessageTemplateDto,
  ) {
    return this.aiPlatform.createMessageTemplate(
      this.actor(context),
      this.withTenant(context, body),
    );
  }

  @Patch("message-templates/:id")
  @RequireScopes("ai:campaigns:write")
  updateMessageTemplate(
    @TenantContext() context: ApiTokenControllerContext,
    @Param("id") id: string,
    @Body() body: ApiUpdateMessageTemplateDto,
  ) {
    return this.aiPlatform.updateMessageTemplate(
      this.actor(context),
      id,
      this.withTenant(context, body),
    );
  }

  @Get("campaigns")
  @RequireScopes("ai:campaigns:read")
  listCampaigns(
    @TenantContext() context: ApiTokenControllerContext,
    @Query() query: ApiListCampaignsQueryDto,
  ) {
    return this.aiPlatform.listCampaigns(
      this.actor(context),
      this.withTenant(context, query),
    );
  }

  @Post("campaigns")
  @RequireScopes("ai:campaigns:write")
  createCampaign(
    @TenantContext() context: ApiTokenControllerContext,
    @Body() body: ApiCreateCampaignDto,
  ) {
    return this.aiPlatform.createCampaign(
      this.actor(context),
      this.withTenant(context, body),
    );
  }

  @Post("notifications")
  @RequireScopes("ai:campaigns:write")
  sendNotification(
    @TenantContext() context: ApiTokenControllerContext,
    @Body() body: ApiSendNotificationDto,
  ) {
    return this.aiPlatform.sendNotification(
      this.actor(context),
      this.withTenant(context, body),
    );
  }

  @Get("queue")
  @RequireScopes("ai:queue:read")
  listQueue(
    @TenantContext() context: ApiTokenControllerContext,
    @Query() query: ApiQueueListQueryDto,
  ) {
    return this.aiPlatform.listQueue(
      this.actor(context),
      this.withTenant(context, query),
    );
  }

  private actor(context: ApiTokenControllerContext): AiPlatformActor {
    return {
      type: "apiToken",
      tenantId: context.tenantId,
      appId: context.appId,
      apiTokenId: context.apiTokenId,
    };
  }

  private withTenant<T extends object>(
    context: ApiTokenControllerContext,
    data: T,
  ): T & { tenantId: string } {
    return {
      ...data,
      tenantId: context.tenantId,
    };
  }
}
