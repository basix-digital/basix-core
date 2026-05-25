import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from "class-validator";

export class ApiPaginatedQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset = 0;
}

export class ApiListContactsQueryDto extends ApiPaginatedQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  status?: string;
}

export class ApiCreateContactDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsString()
  phone!: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  leadScore?: number;

  @IsOptional()
  @IsString()
  assignedTo?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ApiUpdateContactDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  leadScore?: number;

  @IsOptional()
  @IsString()
  assignedTo?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsUUID()
  pipelineId?: string;

  @IsOptional()
  @IsUUID()
  stageId?: string;
}

export class ApiCreateChannelDto {
  @IsString()
  displayName!: string;

  @IsString()
  phoneNumber!: string;

  @IsString()
  agentIdDefault!: string;

  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsObject()
  secrets?: Record<string, unknown>;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  rateLimitPerMinute?: number;
}

export class ApiUpdateChannelDto {
  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  agentIdDefault?: string;

  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsIn(["active", "paused", "archived"])
  status?: string;

  @IsOptional()
  @IsObject()
  secrets?: Record<string, unknown>;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  rateLimitPerMinute?: number;
}

export class ApiChatQueryDto {
  @IsOptional()
  @IsUUID()
  channelId?: string;
}

export class ApiChatListQueryDto extends ApiPaginatedQueryDto {
  @IsOptional()
  @IsUUID()
  channelId?: string;

  @IsOptional()
  @IsString()
  mode?: string;
}

export class ApiTakeoverDto {
  @IsOptional()
  @IsUUID()
  channelId?: string;
}

export class ApiManualMessageDto {
  @IsOptional()
  @IsUUID()
  channelId?: string;

  @IsString()
  body!: string;
}

export class ApiQueueListQueryDto extends ApiPaginatedQueryDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsUUID()
  channelId?: string;
}

export class ApiAgentSettingsDto {
  @IsOptional()
  @IsIn(["openrouter", "openai"])
  provider?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsString()
  systemPrompt!: string;

  @IsOptional()
  @Type(() => Number)
  @Min(0)
  @Max(2)
  temperature?: number;

  @IsOptional()
  @Type(() => Number)
  @Min(0)
  @Max(1)
  topP?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(500)
  topK?: number;
}

export class ApiCreatePlaybookDto {
  @IsString()
  title!: string;

  @IsIn(["objection", "pattern", "correction"])
  type!: string;

  @IsString()
  category!: string;

  @IsIn(["awareness", "consideration", "closing"])
  stage!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  triggerPhrases?: string[];

  @IsString()
  situation!: string;

  @IsString()
  responseStrategy!: string;

  @IsString()
  exampleResponse!: string;

  @IsString()
  rationale!: string;

  @IsString()
  nextStep!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10)
  priority?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @Type(() => Number)
  @Min(0)
  @Max(1)
  minScore?: number;

  @IsOptional()
  @IsBoolean()
  isGlobalTemplate?: boolean;
}

export class ApiUpdatePlaybookDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsIn(["objection", "pattern", "correction"])
  type?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsIn(["draft", "active", "archived"])
  status?: string;

  @IsOptional()
  @IsIn(["awareness", "consideration", "closing"])
  stage?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  triggerPhrases?: string[];

  @IsOptional()
  @IsString()
  situation?: string;

  @IsOptional()
  @IsString()
  responseStrategy?: string;

  @IsOptional()
  @IsString()
  exampleResponse?: string;

  @IsOptional()
  @IsString()
  rationale?: string;

  @IsOptional()
  @IsString()
  nextStep?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10)
  priority?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @Type(() => Number)
  @Min(0)
  @Max(1)
  minScore?: number;
}

export class ApiAssignPlaybookDto {
  @IsString()
  agentId!: string;

  @IsOptional()
  @IsUUID()
  playbookVersionId?: string;

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10)
  priorityOverride?: number;

  @IsOptional()
  @Type(() => Number)
  @Min(0)
  @Max(1)
  minScoreOverride?: number;
}

export class ApiListMessageTemplatesQueryDto {
  @IsOptional()
  @IsIn(["whatsapp", "email"])
  channelType?: string;

  @IsOptional()
  @IsIn(["active", "archived"])
  status?: string;
}

export class ApiCreateMessageTemplateDto {
  @IsString()
  name!: string;

  @IsIn(["whatsapp", "email"])
  channelType!: string;

  @IsOptional()
  @IsIn(["brevo", "twilio", "sent_dm"])
  provider?: string;

  @IsOptional()
  @IsString()
  providerTemplateId?: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsString()
  body!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  variables?: string[];
}

export class ApiUpdateMessageTemplateDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsIn(["brevo", "twilio", "sent_dm"])
  provider?: string;

  @IsOptional()
  @IsString()
  providerTemplateId?: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  variables?: string[];

  @IsOptional()
  @IsIn(["active", "archived"])
  status?: string;
}

export class ApiListCampaignsQueryDto extends ApiPaginatedQueryDto {
  @IsOptional()
  @IsIn(["draft", "queued", "sent", "failed", "canceled"])
  status?: string;

  @IsOptional()
  @IsIn(["whatsapp", "email"])
  channelType?: string;
}

export class ApiCreateCampaignDto {
  @IsUUID()
  templateId!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsIn(["whatsapp", "email"])
  channelType?: string;

  @IsOptional()
  @IsUUID()
  channelId?: string;

  @IsOptional()
  @IsArray()
  @IsUUID("4", { each: true })
  contactIds?: string[];

  @IsOptional()
  @IsString()
  audienceStatus?: string;

  @IsOptional()
  @IsObject()
  variables?: Record<string, unknown>;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}

export class ApiSendNotificationDto {
  @IsUUID()
  templateId!: string;

  @IsOptional()
  @IsUUID()
  channelId?: string;

  @IsOptional()
  @IsUUID()
  contactId?: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsObject()
  variables?: Record<string, unknown>;
}
