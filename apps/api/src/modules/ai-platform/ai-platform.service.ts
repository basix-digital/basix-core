import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { Prisma } from "@basix-core/database";
import { TenantAccessService } from "../common/context/tenant-access.service";
import { PlanLimitService } from "../observability/services/plan-limit.service";
import { PrismaService } from "../prisma/prisma.service";
import { AGENT_CATALOG, AGENT_IDS } from "./agent-catalog";
import {
  AgentSettingsDto,
  AssignPlaybookDto,
  ChatListQueryDto,
  ChatQueryDto,
  CreateChannelDto,
  CreateCampaignDto,
  CreateContactDto,
  CreateMessageTemplateDto,
  CreatePlaybookDto,
  ListContactsQueryDto,
  ListCampaignsQueryDto,
  ListMessageTemplatesQueryDto,
  ManualMessageDto,
  PaginatedTenantQueryDto,
  QueueListQueryDto,
  SendNotificationDto,
  TakeoverDto,
  TenantScopedQueryDto,
  UpdateChannelDto,
  UpdateContactDto,
  UpdateMessageTemplateDto,
  UpdatePlaybookDto,
} from "./dto/ai-platform.dto";
import { SecretCipherService } from "./secret-cipher.service";

const contactSelect = {
  id: true,
  tenantId: true,
  fullName: true,
  phone: true,
  email: true,
  source: true,
  status: true,
  leadScore: true,
  assignedTo: true,
  tags: true,
  notes: true,
  pipelineId: true,
  stageId: true,
  lastContactAt: true,
  createdAt: true,
  updatedAt: true,
  pipeline: { select: { id: true, name: true, key: true } },
  stage: { select: { id: true, name: true, key: true } },
} as const;

const channelSelect = {
  id: true,
  tenantId: true,
  displayName: true,
  phoneNumber: true,
  agentIdDefault: true,
  provider: true,
  status: true,
  rateLimitPerMinute: true,
  createdAt: true,
  updatedAt: true,
} as const;

const maxCampaignRecipients = 500;

const templateSelect = {
  id: true,
  tenantId: true,
  name: true,
  channelType: true,
  provider: true,
  providerTemplateId: true,
  subject: true,
  body: true,
  variables: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const;

const campaignSelect = {
  id: true,
  tenantId: true,
  templateId: true,
  name: true,
  channelType: true,
  status: true,
  audienceFilter: true,
  scheduledAt: true,
  sentAt: true,
  createdAt: true,
  updatedAt: true,
  template: { select: templateSelect },
  _count: { select: { recipients: true } },
} as const;

export type AiPlatformActor =
  | { type: "admin"; userId: string }
  | {
      type: "apiToken";
      tenantId: string;
      appId: string;
      apiTokenId: string;
    };

export type AiPlatformActorInput = string | AiPlatformActor;

@Injectable()
export class AiPlatformService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantAccess: TenantAccessService,
    private readonly planLimitService: PlanLimitService,
    private readonly secretCipher: SecretCipherService,
  ) {}

  async listContacts(
    actorInput: AiPlatformActorInput,
    query: ListContactsQueryDto,
  ) {
    await this.assertTenantOperational(actorInput, query.tenantId);
    const where: Prisma.CrmContactWhereInput = {
      tenantId: query.tenantId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { fullName: { contains: query.search, mode: "insensitive" } },
              { phone: { contains: query.search, mode: "insensitive" } },
              { email: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.crmContact.findMany({
        where,
        orderBy: { lastContactAt: "desc" },
        take: query.limit,
        skip: query.offset,
        select: contactSelect,
      }),
      this.prisma.crmContact.count({ where }),
    ]);

    return { data, total };
  }

  async createContact(
    actorInput: AiPlatformActorInput,
    data: CreateContactDto,
  ) {
    const actor = this.normalizeActor(actorInput);
    await this.assertTenantOperational(actor, data.tenantId);
    const phone = this.normalizeE164(data.phone);

    try {
      return await this.prisma.$transaction(
        async (tx: Prisma.TransactionClient) => {
          const { pipeline, stage } = await this.ensureDefaultPipeline(
            tx,
            data.tenantId,
          );
          const contact = await tx.crmContact.create({
            data: {
              tenantId: data.tenantId,
              fullName: data.fullName?.trim() || null,
              phone,
              email: data.email?.trim() || null,
              source: data.source?.trim() || "manual",
              status: data.status?.trim() || "new",
              leadScore: data.leadScore ?? 0,
              assignedTo: data.assignedTo || null,
              tags: data.tags ?? [],
              notes: data.notes?.trim() || null,
              pipelineId: pipeline.id,
              stageId: stage.id,
              lastContactAt: new Date(),
            },
            select: contactSelect,
          });

          await this.createCrmActivity(tx, {
            tenantId: data.tenantId,
            contactId: contact.id,
            pipelineId: pipeline.id,
            stageId: stage.id,
            actorUserId: this.actorUserId(actor),
            type: "manual_contact_created",
            title: "Contact created",
            metadata: { source: contact.source },
          });
          await this.audit(
            tx,
            data.tenantId,
            actor,
            "crm.contact.create",
            "CrmContact",
            contact.id,
          );
          return contact;
        },
      );
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException("CRM contact already exists for tenant");
      }
      throw error;
    }
  }

  async updateContact(
    actorInput: AiPlatformActorInput,
    contactId: string,
    data: UpdateContactDto,
  ) {
    const actor = this.normalizeActor(actorInput);
    await this.assertTenantOperational(actor, data.tenantId);
    await this.assertContact(data.tenantId, contactId);

    const contact = await this.prisma.crmContact.update({
      where: { id: contactId },
      data: {
        fullName: data.fullName?.trim(),
        email: data.email?.trim(),
        status: data.status?.trim(),
        leadScore: data.leadScore,
        assignedTo: data.assignedTo,
        tags: data.tags,
        notes: data.notes?.trim(),
        pipelineId: data.pipelineId,
        stageId: data.stageId,
      },
      select: contactSelect,
    });

    await this.audit(
      this.prisma,
      data.tenantId,
      actor,
      "crm.contact.update",
      "CrmContact",
      contact.id,
      { status: contact.status, stageId: contact.stageId },
    );

    return contact;
  }

  async listPipelines(
    actorInput: AiPlatformActorInput,
    query: TenantScopedQueryDto,
  ) {
    await this.assertTenantOperational(actorInput, query.tenantId);
    await this.ensureDefaultPipeline(this.prisma, query.tenantId);

    return this.prisma.crmPipeline.findMany({
      where: { tenantId: query.tenantId },
      orderBy: { sortOrder: "asc" },
      include: {
        stages: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });
  }

  async listActivities(
    actorInput: AiPlatformActorInput,
    query: PaginatedTenantQueryDto,
  ) {
    await this.assertTenantOperational(actorInput, query.tenantId);
    return this.prisma.crmActivity.findMany({
      where: { tenantId: query.tenantId },
      orderBy: { occurredAt: "desc" },
      take: query.limit,
      skip: query.offset,
      include: {
        contact: {
          select: {
            id: true,
            fullName: true,
            phone: true,
          },
        },
        channel: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
    });
  }

  async listChannels(
    actorInput: AiPlatformActorInput,
    query: TenantScopedQueryDto,
  ) {
    await this.assertTenantOperational(actorInput, query.tenantId);
    return this.prisma.aiChannel.findMany({
      where: { tenantId: query.tenantId },
      orderBy: { createdAt: "desc" },
      select: channelSelect,
    });
  }

  async createChannel(
    actorInput: AiPlatformActorInput,
    data: CreateChannelDto,
  ) {
    const actor = this.normalizeActor(actorInput);
    await this.assertTenantOperational(actor, data.tenantId);
    this.assertKnownAgent(data.agentIdDefault);
    const phoneNumber = this.normalizeWhatsappAddress(data.phoneNumber);
    const encryptedSecrets =
      this.secretCipher.encryptJson(data.secrets) ?? undefined;

    try {
      return await this.prisma.$transaction(
        async (tx: Prisma.TransactionClient) => {
          const channel = await tx.aiChannel.create({
            data: {
              tenantId: data.tenantId,
              displayName: data.displayName.trim(),
              phoneNumber,
              agentIdDefault: data.agentIdDefault,
              provider: data.provider?.trim() || "twilio",
              encryptedSecrets,
              rateLimitPerMinute: data.rateLimitPerMinute,
            },
            select: channelSelect,
          });

          await this.audit(
            tx,
            data.tenantId,
            actor,
            "ai.channel.create",
            "AiChannel",
            channel.id,
            { phoneNumber: channel.phoneNumber, provider: channel.provider },
          );

          return channel;
        },
      );
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException("WhatsApp channel phone already exists");
      }
      throw error;
    }
  }

  async updateChannel(
    actorInput: AiPlatformActorInput,
    channelId: string,
    data: UpdateChannelDto,
  ) {
    const actor = this.normalizeActor(actorInput);
    await this.assertTenantOperational(actor, data.tenantId);

    if (data.agentIdDefault) {
      this.assertKnownAgent(data.agentIdDefault);
    }

    const encryptedSecrets =
      data.secrets !== undefined
        ? (this.secretCipher.encryptJson(data.secrets) ?? undefined)
        : undefined;
    const updateData: Prisma.AiChannelUpdateInput = {
      ...(data.displayName !== undefined
        ? { displayName: data.displayName.trim() }
        : {}),
      ...(data.phoneNumber !== undefined
        ? { phoneNumber: this.normalizeWhatsappAddress(data.phoneNumber) }
        : {}),
      ...(data.agentIdDefault !== undefined
        ? { agentIdDefault: data.agentIdDefault }
        : {}),
      ...(data.provider !== undefined
        ? { provider: data.provider.trim() }
        : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.rateLimitPerMinute !== undefined
        ? { rateLimitPerMinute: data.rateLimitPerMinute }
        : {}),
      ...(encryptedSecrets !== undefined ? { encryptedSecrets } : {}),
    };

    try {
      return await this.prisma.$transaction(
        async (tx: Prisma.TransactionClient) => {
          const existing = await tx.aiChannel.findFirst({
            where: { id: channelId, tenantId: data.tenantId },
            select: { id: true },
          });

          if (!existing) {
            throw new NotFoundException("AI channel not found");
          }

          const channel = await tx.aiChannel.update({
            where: { id: channelId },
            data: updateData,
            select: channelSelect,
          });

          await this.audit(
            tx,
            data.tenantId,
            actor,
            "ai.channel.update",
            "AiChannel",
            channel.id,
            {
              agentIdDefault: channel.agentIdDefault,
              status: channel.status,
              provider: channel.provider,
            },
          );

          return channel;
        },
      );
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException("WhatsApp channel phone already exists");
      }
      throw error;
    }
  }

  async listChats(actorInput: AiPlatformActorInput, query: ChatListQueryDto) {
    await this.assertTenantOperational(actorInput, query.tenantId);
    const where: Prisma.AiConversationWhereInput = {
      tenantId: query.tenantId,
      ...(query.channelId ? { channelId: query.channelId } : {}),
      ...(query.mode ? { mode: query.mode } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.aiConversation.findMany({
        where,
        orderBy: { lastMessageAt: "desc" },
        take: query.limit,
        skip: query.offset,
        include: {
          channel: {
            select: { id: true, displayName: true, phoneNumber: true },
          },
          crmContact: {
            select: {
              id: true,
              fullName: true,
              phone: true,
              status: true,
              leadScore: true,
            },
          },
        },
      }),
      this.prisma.aiConversation.count({ where }),
    ]);

    return { data, total };
  }

  async listQueue(actorInput: AiPlatformActorInput, query: QueueListQueryDto) {
    await this.assertTenantOperational(actorInput, query.tenantId);
    const where: Prisma.AiMessageQueueWhereInput = {
      tenantId: query.tenantId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.channelId ? { channelId: query.channelId } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.aiMessageQueue.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: query.limit,
        skip: query.offset,
        include: {
          channel: {
            select: {
              id: true,
              displayName: true,
              phoneNumber: true,
            },
          },
          crmContact: {
            select: {
              id: true,
              fullName: true,
              phone: true,
            },
          },
        },
      }),
      this.prisma.aiMessageQueue.count({ where }),
    ]);

    return { data, total };
  }

  async getChat(
    actorInput: AiPlatformActorInput,
    phone: string,
    query: ChatQueryDto,
  ) {
    await this.assertTenantOperational(actorInput, query.tenantId);
    const conversation = await this.getConversationByPhone(
      query.tenantId,
      phone,
      query.channelId,
    );

    const [queue, manualMessages, activities] = await Promise.all([
      this.prisma.aiMessageQueue.findMany({
        where: { tenantId: query.tenantId, conversationId: conversation.id },
        orderBy: { createdAt: "asc" },
        take: 100,
      }),
      this.prisma.aiManualMessage.findMany({
        where: { tenantId: query.tenantId, conversationId: conversation.id },
        orderBy: { createdAt: "asc" },
        take: 100,
      }),
      this.prisma.crmActivity.findMany({
        where: {
          tenantId: query.tenantId,
          contactId: conversation.crmContactId,
        },
        orderBy: { occurredAt: "desc" },
        take: 50,
      }),
    ]);

    return { conversation, queue, manualMessages, activities };
  }

  async takeoverChat(
    actorInput: AiPlatformActorInput,
    phone: string,
    data: TakeoverDto,
  ) {
    const actor = this.normalizeActor(actorInput);
    await this.assertTenantOperational(actor, data.tenantId);
    const conversation = await this.getConversationByPhone(
      data.tenantId,
      phone,
      data.channelId,
    );
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const updated = await tx.aiConversation.update({
        where: { id: conversation.id },
        data: {
          mode: "human",
          takenOverByUserId: this.actorUserId(actor),
          takenOverAt: new Date(),
          releasedAt: null,
        },
        include: { channel: true, crmContact: true },
      });

      await this.createCrmActivity(tx, {
        tenantId: data.tenantId,
        contactId: updated.crmContactId,
        pipelineId: updated.crmContact?.pipelineId,
        stageId: updated.crmContact?.stageId,
        channelId: updated.channelId,
        actorUserId: this.actorUserId(actor),
        type: "takeover",
        title: "Human takeover",
        metadata: { conversationId: updated.id },
      });
      await this.audit(
        tx,
        data.tenantId,
        actor,
        "ai.chat.takeover",
        "AiConversation",
        updated.id,
      );
      return updated;
    });
  }

  async releaseChat(
    actorInput: AiPlatformActorInput,
    phone: string,
    data: TakeoverDto,
  ) {
    const actor = this.normalizeActor(actorInput);
    await this.assertTenantOperational(actor, data.tenantId);
    const conversation = await this.getConversationByPhone(
      data.tenantId,
      phone,
      data.channelId,
    );

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const updated = await tx.aiConversation.update({
        where: { id: conversation.id },
        data: {
          mode: "ai",
          releasedAt: new Date(),
        },
        include: { channel: true, crmContact: true },
      });

      await this.createCrmActivity(tx, {
        tenantId: data.tenantId,
        contactId: updated.crmContactId,
        pipelineId: updated.crmContact?.pipelineId,
        stageId: updated.crmContact?.stageId,
        channelId: updated.channelId,
        actorUserId: this.actorUserId(actor),
        type: "release_to_ai",
        title: "Released to AI",
        metadata: { conversationId: updated.id },
      });
      await this.audit(
        tx,
        data.tenantId,
        actor,
        "ai.chat.release",
        "AiConversation",
        updated.id,
      );
      return updated;
    });
  }

  async sendManualMessage(
    actorInput: AiPlatformActorInput,
    phone: string,
    data: ManualMessageDto,
  ) {
    const actor = this.normalizeActor(actorInput);
    await this.assertTenantOperational(actor, data.tenantId);
    if (!data.body.trim()) {
      throw new BadRequestException("Message body is required");
    }
    const conversation = await this.getConversationByPhone(
      data.tenantId,
      phone,
      data.channelId,
    );
    if (conversation.mode !== "human") {
      throw new BadRequestException(
        "Takeover is required before sending manual messages",
      );
    }

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const manual = await tx.aiManualMessage.create({
        data: {
          tenantId: data.tenantId,
          channelId: conversation.channelId,
          conversationId: conversation.id,
          crmContactId: conversation.crmContactId,
          phoneNumber: conversation.phoneNumber,
          agentId: conversation.agentId,
          senderUserId: this.actorUserId(actor),
          body: data.body.trim(),
        },
      });

      await tx.aiConversation.update({
        where: { id: conversation.id },
        data: {
          lastMessage: data.body.trim(),
          lastMessageAt: new Date(),
          messageCount: { increment: 1 },
        },
      });

      await this.createCrmActivity(tx, {
        tenantId: data.tenantId,
        contactId: conversation.crmContactId,
        pipelineId: conversation.crmContact?.pipelineId,
        stageId: conversation.crmContact?.stageId,
        channelId: conversation.channelId,
        actorUserId: this.actorUserId(actor),
        type: "message_sent",
        direction: "outbound",
        title: "Manual message sent",
        body: data.body.trim(),
        metadata: { manualMessageId: manual.id },
      });
      await this.audit(
        tx,
        data.tenantId,
        actor,
        "ai.chat.manual_message",
        "AiManualMessage",
        manual.id,
      );
      return manual;
    });
  }

  async listAgents(
    actorInput: AiPlatformActorInput,
    query: TenantScopedQueryDto,
  ) {
    await this.assertTenantOperational(actorInput, query.tenantId);
    const settings = await this.prisma.aiAgentLlmSetting.findMany({
      where: { tenantId: query.tenantId },
    });
    const settingsByAgent = new Map(
      settings.map((item) => [item.agentId, item]),
    );
    return AGENT_CATALOG.map((agent) => ({
      ...agent,
      settings: settingsByAgent.get(agent.id) ?? null,
    }));
  }

  async upsertAgentSettings(
    actorInput: AiPlatformActorInput,
    agentId: string,
    data: AgentSettingsDto,
  ) {
    const actor = this.normalizeActor(actorInput);
    await this.assertTenantOperational(actor, data.tenantId);
    this.assertKnownAgent(agentId);
    const actorReference = this.actorReference(actor);

    const settings = await this.prisma.aiAgentLlmSetting.upsert({
      where: {
        tenantId_agentId: {
          tenantId: data.tenantId,
          agentId,
        },
      },
      update: {
        provider: data.provider ?? "openrouter",
        model: data.model,
        systemPrompt: data.systemPrompt,
        temperature: data.temperature,
        topP: data.topP,
        topK: data.topK,
        updatedBy: actorReference,
      },
      create: {
        tenantId: data.tenantId,
        agentId,
        provider: data.provider ?? "openrouter",
        model: data.model,
        systemPrompt: data.systemPrompt,
        temperature: data.temperature,
        topP: data.topP,
        topK: data.topK,
        createdBy: actorReference,
        updatedBy: actorReference,
      },
    });

    await this.audit(
      this.prisma,
      data.tenantId,
      actor,
      "ai.agent_llm_settings.upsert",
      "AiAgentLlmSetting",
      settings.id,
      {
        agentId,
        provider: settings.provider,
        model: settings.model,
      },
    );
    return settings;
  }

  async listPlaybooks(
    actorInput: AiPlatformActorInput,
    query: TenantScopedQueryDto,
  ) {
    await this.assertTenantOperational(actorInput, query.tenantId);
    return this.prisma.aiPlaybook.findMany({
      where: { tenantId: query.tenantId },
      orderBy: { updatedAt: "desc" },
      include: {
        versions: {
          orderBy: { version: "desc" },
          take: 1,
        },
        assignments: true,
      },
    });
  }

  async createPlaybook(
    actorInput: AiPlatformActorInput,
    data: CreatePlaybookDto,
  ) {
    const actor = this.normalizeActor(actorInput);
    await this.assertTenantOperational(actor, data.tenantId);
    const actorReference = this.actorReference(actor);

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const playbook = await tx.aiPlaybook.create({
        data: {
          tenantId: data.tenantId,
          title: data.title.trim(),
          type: data.type,
          category: data.category.trim(),
          status: "draft",
          isGlobalTemplate: data.isGlobalTemplate ?? false,
          createdBy: actorReference,
        },
      });

      const version = await tx.aiPlaybookVersion.create({
        data: {
          tenantId: data.tenantId,
          playbookId: playbook.id,
          version: 1,
          type: data.type,
          category: data.category.trim(),
          stage: data.stage,
          title: data.title.trim(),
          triggerPhrases: data.triggerPhrases ?? [],
          situation: data.situation.trim(),
          responseStrategy: data.responseStrategy.trim(),
          exampleResponse: data.exampleResponse.trim(),
          rationale: data.rationale.trim(),
          nextStep: data.nextStep.trim(),
          priority: data.priority ?? 5,
          tags: data.tags ?? [],
          minScore: data.minScore ?? 0,
          createdBy: actorReference,
          searchText: [
            data.title,
            data.category,
            data.situation,
            data.responseStrategy,
            data.exampleResponse,
          ].join("\n"),
        },
      });

      const updated = await tx.aiPlaybook.update({
        where: { id: playbook.id },
        data: { currentVersionId: version.id },
        include: { versions: true },
      });

      await this.audit(
        tx,
        data.tenantId,
        actor,
        "ai.playbook.create",
        "AiPlaybook",
        playbook.id,
      );
      return updated;
    });
  }

  async updatePlaybook(
    actorInput: AiPlatformActorInput,
    playbookId: string,
    data: UpdatePlaybookDto,
  ) {
    const actor = this.normalizeActor(actorInput);
    await this.assertTenantOperational(actor, data.tenantId);
    const actorReference = this.actorReference(actor);

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const playbook = await tx.aiPlaybook.findFirst({
        where: { id: playbookId, tenantId: data.tenantId },
        include: {
          versions: {
            orderBy: { version: "desc" },
            take: 1,
          },
        },
      });

      if (!playbook || !playbook.versions[0]) {
        throw new NotFoundException("AI playbook not found");
      }

      const latest = playbook.versions[0];
      const shouldCreateVersion = this.hasPlaybookVersionChanges(data);
      let currentVersionId = playbook.currentVersionId;

      if (shouldCreateVersion) {
        const versionData = {
          title: data.title?.trim() || latest.title,
          type: data.type || latest.type,
          category: data.category?.trim() || latest.category,
          stage: data.stage || latest.stage,
          triggerPhrases: data.triggerPhrases ?? latest.triggerPhrases,
          situation: data.situation?.trim() || latest.situation,
          responseStrategy:
            data.responseStrategy?.trim() || latest.responseStrategy,
          exampleResponse:
            data.exampleResponse?.trim() || latest.exampleResponse,
          rationale: data.rationale?.trim() || latest.rationale,
          nextStep: data.nextStep?.trim() || latest.nextStep,
          priority: data.priority ?? latest.priority,
          tags: data.tags ?? latest.tags,
          minScore: data.minScore ?? latest.minScore,
          status: data.status || "draft",
        };

        const version = await tx.aiPlaybookVersion.create({
          data: {
            tenantId: data.tenantId,
            playbookId: playbook.id,
            version: latest.version + 1,
            parentVersion: latest.version,
            createdBy: actorReference,
            ...versionData,
            searchText: this.buildPlaybookSearchText(versionData),
          },
        });
        currentVersionId = version.id;
      } else if (data.status) {
        await tx.aiPlaybookVersion.update({
          where: { id: latest.id },
          data: {
            status: data.status,
            reviewedBy: data.status === "active" ? actorReference : undefined,
            approvedAt: data.status === "active" ? new Date() : undefined,
          },
        });
      }

      const updated = await tx.aiPlaybook.update({
        where: { id: playbook.id },
        data: {
          title: data.title?.trim() || playbook.title,
          type: data.type || playbook.type,
          category: data.category?.trim() || playbook.category,
          status: data.status || playbook.status,
          currentVersionId,
          reviewedBy: data.status === "active" ? actorReference : undefined,
          approvedAt: data.status === "active" ? new Date() : undefined,
        },
        include: {
          versions: {
            orderBy: { version: "desc" },
            take: 1,
          },
          assignments: true,
        },
      });

      await this.audit(
        tx,
        data.tenantId,
        actor,
        "ai.playbook.update",
        "AiPlaybook",
        playbook.id,
        { status: updated.status, currentVersionId: updated.currentVersionId },
      );

      return updated;
    });
  }

  async assignPlaybook(
    actorInput: AiPlatformActorInput,
    playbookId: string,
    data: AssignPlaybookDto,
  ) {
    const actor = this.normalizeActor(actorInput);
    await this.assertTenantOperational(actor, data.tenantId);
    this.assertKnownAgent(data.agentId);
    const actorReference = this.actorReference(actor);

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const playbook = await tx.aiPlaybook.findFirst({
        where: { id: playbookId, tenantId: data.tenantId },
        select: {
          id: true,
          currentVersionId: true,
          status: true,
        },
      });

      if (!playbook) {
        throw new NotFoundException("AI playbook not found");
      }

      const playbookVersionId =
        data.playbookVersionId ?? playbook.currentVersionId;
      if (!playbookVersionId) {
        throw new BadRequestException("Playbook has no current version");
      }

      const version = await tx.aiPlaybookVersion.findFirst({
        where: {
          id: playbookVersionId,
          tenantId: data.tenantId,
          playbookId: playbook.id,
        },
        select: { id: true, status: true },
      });

      if (!version) {
        throw new NotFoundException("AI playbook version not found");
      }

      const isEnabled = data.isEnabled ?? true;
      const isActive = isEnabled && (data.isActive ?? true);

      if (isActive) {
        await tx.aiAgentPlaybookAssignment.updateMany({
          where: {
            tenantId: data.tenantId,
            agentId: data.agentId,
            playbookId: playbook.id,
            isActive: true,
          },
          data: {
            isActive: false,
            disabledAt: new Date(),
          },
        });
      }

      const assignment = await tx.aiAgentPlaybookAssignment.upsert({
        where: {
          tenantId_agentId_playbookId_playbookVersionId: {
            tenantId: data.tenantId,
            agentId: data.agentId,
            playbookId: playbook.id,
            playbookVersionId,
          },
        },
        update: {
          isEnabled,
          isActive,
          priorityOverride: data.priorityOverride,
          minScoreOverride: data.minScoreOverride,
          activatedBy: isActive ? actorReference : undefined,
          activatedAt: isActive ? new Date() : undefined,
          disabledAt: isEnabled ? null : new Date(),
        },
        create: {
          tenantId: data.tenantId,
          agentId: data.agentId,
          playbookId: playbook.id,
          playbookVersionId,
          isEnabled,
          isActive,
          priorityOverride: data.priorityOverride,
          minScoreOverride: data.minScoreOverride,
          activatedBy: isActive ? actorReference : null,
          activatedAt: isActive ? new Date() : null,
          disabledAt: isEnabled ? null : new Date(),
        },
        include: {
          playbook: true,
          playbookVersion: true,
        },
      });

      await this.audit(
        tx,
        data.tenantId,
        actor,
        "ai.playbook.assign",
        "AiAgentPlaybookAssignment",
        assignment.id,
        {
          agentId: data.agentId,
          playbookId: playbook.id,
          playbookVersionId,
          isActive,
        },
      );

      return assignment;
    });
  }

  async listMessageTemplates(
    actorInput: AiPlatformActorInput,
    query: ListMessageTemplatesQueryDto,
  ) {
    await this.assertTenantOperational(actorInput, query.tenantId);

    return this.prisma.aiMessageTemplate.findMany({
      where: {
        tenantId: query.tenantId,
        ...(query.channelType ? { channelType: query.channelType } : {}),
        ...(query.status ? { status: query.status } : {}),
      },
      orderBy: { updatedAt: "desc" },
      select: templateSelect,
    });
  }

  async createMessageTemplate(
    actorInput: AiPlatformActorInput,
    data: CreateMessageTemplateDto,
  ) {
    const actor = this.normalizeActor(actorInput);
    await this.assertTenantOperational(actor, data.tenantId);
    const actorReference = this.actorReference(actor);
    const provider =
      data.provider ?? this.defaultMessagingProvider(data.channelType);
    this.assertTemplateProvider(
      data.channelType,
      provider,
      data.providerTemplateId,
    );
    this.assertEmailTemplateSubject(
      data.channelType,
      data.subject,
      data.providerTemplateId,
    );

    const subject = data.subject?.trim() || null;
    const body = data.body.trim();
    const variables = data.variables?.length
      ? data.variables
      : this.extractTemplateVariables(subject, body);

    try {
      return await this.prisma.$transaction(
        async (tx: Prisma.TransactionClient) => {
          const template = await tx.aiMessageTemplate.create({
            data: {
              tenantId: data.tenantId,
              name: data.name.trim(),
              channelType: data.channelType,
              provider,
              providerTemplateId: data.providerTemplateId?.trim() || null,
              subject,
              body,
              variables,
              createdBy: actorReference,
              updatedBy: actorReference,
            },
            select: templateSelect,
          });

          await this.audit(
            tx,
            data.tenantId,
            actor,
            "ai.message_template.create",
            "AiMessageTemplate",
            template.id,
            {
              channelType: template.channelType,
              provider: template.provider,
              providerTemplateId: template.providerTemplateId,
            },
          );

          return template;
        },
      );
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException("Message template name already exists");
      }
      throw error;
    }
  }

  async updateMessageTemplate(
    actorInput: AiPlatformActorInput,
    templateId: string,
    data: UpdateMessageTemplateDto,
  ) {
    const actor = this.normalizeActor(actorInput);
    await this.assertTenantOperational(actor, data.tenantId);
    const actorReference = this.actorReference(actor);

    try {
      return await this.prisma.$transaction(
        async (tx: Prisma.TransactionClient) => {
          const existing = await tx.aiMessageTemplate.findFirst({
            where: { id: templateId, tenantId: data.tenantId },
          });

          if (!existing) {
            throw new NotFoundException("Message template not found");
          }

          const subject =
            data.subject !== undefined
              ? data.subject.trim() || null
              : existing.subject;
          const body =
            data.body !== undefined ? data.body.trim() : existing.body;
          const provider = data.provider ?? existing.provider;
          const providerTemplateId =
            data.providerTemplateId !== undefined
              ? data.providerTemplateId.trim() || null
              : existing.providerTemplateId;
          this.assertTemplateProvider(
            existing.channelType,
            provider,
            providerTemplateId,
          );
          this.assertEmailTemplateSubject(
            existing.channelType,
            subject,
            providerTemplateId,
          );

          const template = await tx.aiMessageTemplate.update({
            where: { id: templateId },
            data: {
              ...(data.name !== undefined ? { name: data.name.trim() } : {}),
              ...(data.provider !== undefined ? { provider } : {}),
              ...(data.providerTemplateId !== undefined
                ? { providerTemplateId }
                : {}),
              ...(data.subject !== undefined ? { subject } : {}),
              ...(data.body !== undefined ? { body } : {}),
              ...(data.variables !== undefined
                ? { variables: data.variables }
                : data.body !== undefined || data.subject !== undefined
                  ? { variables: this.extractTemplateVariables(subject, body) }
                  : {}),
              ...(data.status !== undefined ? { status: data.status } : {}),
              updatedBy: actorReference,
            },
            select: templateSelect,
          });

          await this.audit(
            tx,
            data.tenantId,
            actor,
            "ai.message_template.update",
            "AiMessageTemplate",
            template.id,
            {
              status: template.status,
              provider: template.provider,
              providerTemplateId: template.providerTemplateId,
            },
          );

          return template;
        },
      );
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException("Message template name already exists");
      }
      throw error;
    }
  }

  async listCampaigns(
    actorInput: AiPlatformActorInput,
    query: ListCampaignsQueryDto,
  ) {
    await this.assertTenantOperational(actorInput, query.tenantId);
    const where: Prisma.AiCampaignWhereInput = {
      tenantId: query.tenantId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.channelType ? { channelType: query.channelType } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.aiCampaign.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: query.limit,
        skip: query.offset,
        select: campaignSelect,
      }),
      this.prisma.aiCampaign.count({ where }),
    ]);

    return { data, total };
  }

  async createCampaign(
    actorInput: AiPlatformActorInput,
    data: CreateCampaignDto,
  ) {
    const actor = this.normalizeActor(actorInput);
    await this.assertTenantOperational(actor, data.tenantId);

    return this.createCampaignWithRecipients(actor, {
      tenantId: data.tenantId,
      templateId: data.templateId,
      name: data.name,
      channelType: data.channelType,
      channelId: data.channelId,
      contactIds: data.contactIds,
      audienceStatus: data.audienceStatus,
      variables: data.variables,
      scheduledAt: data.scheduledAt,
    });
  }

  async sendNotification(
    actorInput: AiPlatformActorInput,
    data: SendNotificationDto,
  ) {
    const actor = this.normalizeActor(actorInput);
    await this.assertTenantOperational(actor, data.tenantId);

    return this.createCampaignWithRecipients(actor, {
      tenantId: data.tenantId,
      templateId: data.templateId,
      name: "Manual notification",
      channelId: data.channelId,
      contactIds: data.contactId ? [data.contactId] : undefined,
      directRecipient:
        data.phoneNumber || data.email
          ? {
              phoneNumber: data.phoneNumber,
              email: data.email,
            }
          : undefined,
      variables: data.variables,
    });
  }

  async getMetrics(
    actorInput: AiPlatformActorInput,
    query: TenantScopedQueryDto,
  ) {
    await this.assertTenantOperational(actorInput, query.tenantId);
    const [
      contacts,
      channels,
      conversations,
      humanConversations,
      queuedMessages,
      failedMessages,
      playbooks,
      plan,
    ] = await Promise.all([
      this.prisma.crmContact.count({ where: { tenantId: query.tenantId } }),
      this.prisma.aiChannel.count({ where: { tenantId: query.tenantId } }),
      this.prisma.aiConversation.count({ where: { tenantId: query.tenantId } }),
      this.prisma.aiConversation.count({
        where: { tenantId: query.tenantId, mode: "human" },
      }),
      this.prisma.aiMessageQueue.count({
        where: { tenantId: query.tenantId, status: "queued" },
      }),
      this.prisma.aiMessageQueue.count({
        where: { tenantId: query.tenantId, status: "failed" },
      }),
      this.prisma.aiPlaybook.count({ where: { tenantId: query.tenantId } }),
      this.planLimitService.validateTenantRequestQuota(query.tenantId),
    ]);

    return {
      tenantId: query.tenantId,
      contacts,
      channels,
      conversations,
      humanConversations,
      queuedMessages,
      failedMessages,
      playbooks,
      plan,
    };
  }

  private async createCampaignWithRecipients(
    actor: AiPlatformActor,
    data: {
      tenantId: string;
      templateId: string;
      name: string;
      channelType?: string;
      channelId?: string;
      contactIds?: string[];
      audienceStatus?: string;
      directRecipient?: { phoneNumber?: string; email?: string };
      variables?: Record<string, unknown>;
      scheduledAt?: string;
    },
  ) {
    const template = await this.prisma.aiMessageTemplate.findFirst({
      where: {
        id: data.templateId,
        tenantId: data.tenantId,
        status: "active",
      },
      select: templateSelect,
    });

    if (!template) {
      throw new NotFoundException("Message template not found");
    }

    const channelType = data.channelType ?? template.channelType;
    if (channelType !== template.channelType) {
      throw new BadRequestException(
        "Campaign channel type must match template",
      );
    }

    const channel =
      channelType === "whatsapp"
        ? await this.getActiveChannel(data.tenantId, data.channelId)
        : null;

    const contacts = await this.resolveCampaignContacts(data);
    const recipients = this.buildCampaignRecipients({
      template,
      channelType,
      contacts,
      directRecipient: data.directRecipient,
      variables: data.variables,
    });

    if (!recipients.length) {
      throw new BadRequestException("Campaign needs at least one recipient");
    }

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const campaign = await tx.aiCampaign.create({
        data: {
          tenantId: data.tenantId,
          templateId: template.id,
          name: data.name.trim(),
          channelType,
          status: "queued",
          scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
          audienceFilter: this.buildAudienceFilter(data),
          createdBy: this.actorReference(actor),
        },
      });

      let queuedCount = 0;
      let skippedCount = 0;

      for (const recipient of recipients) {
        if (recipient.status === "skipped") {
          skippedCount += 1;
          await tx.aiCampaignRecipient.create({
            data: {
              tenantId: data.tenantId,
              campaignId: campaign.id,
              contactId: recipient.contactId,
              channelId: channel?.id ?? null,
              phoneNumber: recipient.phoneNumber,
              email: recipient.email,
              status: "skipped",
              providerVariables: recipient.providerVariables,
              renderedSubject: recipient.renderedSubject,
              renderedBody: recipient.renderedBody,
              error: recipient.error,
            },
          });
          continue;
        }

        queuedCount += 1;
        let manualMessageId: string | null = null;
        let conversationId: string | null = null;

        if (channelType === "whatsapp" && channel && recipient.phoneNumber) {
          const conversation = await tx.aiConversation.upsert({
            where: {
              tenantId_channelId_phoneNumber: {
                tenantId: data.tenantId,
                channelId: channel.id,
                phoneNumber: recipient.phoneNumber,
              },
            },
            update: {
              crmContactId: recipient.contactId,
              agentId: channel.agentIdDefault,
              lastMessage: recipient.renderedBody,
              lastMessageAt: new Date(),
              messageCount: { increment: 1 },
            },
            create: {
              tenantId: data.tenantId,
              channelId: channel.id,
              crmContactId: recipient.contactId,
              phoneNumber: recipient.phoneNumber,
              agentId: channel.agentIdDefault,
              threadId: `campaign:${campaign.id}:${recipient.phoneNumber}`,
              mode: "human",
              lastMessage: recipient.renderedBody,
              messageCount: 1,
            },
            select: { id: true },
          });
          conversationId = conversation.id;

          const manual = await tx.aiManualMessage.create({
            data: {
              tenantId: data.tenantId,
              channelId: channel.id,
              conversationId,
              crmContactId: recipient.contactId,
              phoneNumber: recipient.phoneNumber,
              agentId: channel.agentIdDefault,
              senderUserId: this.actorUserId(actor),
              body: recipient.renderedBody,
              providerTemplateId: template.providerTemplateId,
              providerVariables: recipient.providerVariables,
            },
            select: { id: true },
          });
          manualMessageId = manual.id;
        }

        await tx.aiCampaignRecipient.create({
          data: {
            tenantId: data.tenantId,
            campaignId: campaign.id,
            contactId: recipient.contactId,
            channelId: channel?.id ?? null,
            manualMessageId,
            phoneNumber: recipient.phoneNumber,
            email: recipient.email,
            status: "queued",
            providerVariables: recipient.providerVariables,
            renderedSubject: recipient.renderedSubject,
            renderedBody: recipient.renderedBody,
          },
        });

        await this.createCrmActivity(tx, {
          tenantId: data.tenantId,
          contactId: recipient.contactId,
          channelId: channel?.id ?? null,
          actorUserId: this.actorUserId(actor),
          type:
            channelType === "whatsapp"
              ? "whatsapp_campaign_queued"
              : "email_campaign_queued",
          direction: "outbound",
          title:
            channelType === "whatsapp"
              ? "WhatsApp message queued"
              : "Email message queued",
          body: recipient.renderedBody,
          metadata: {
            campaignId: campaign.id,
            templateId: template.id,
            manualMessageId,
          },
        });
      }

      const updated = await tx.aiCampaign.update({
        where: { id: campaign.id },
        data: {
          status: queuedCount > 0 ? "queued" : "failed",
        },
        select: campaignSelect,
      });

      await this.audit(
        tx,
        data.tenantId,
        actor,
        "ai.campaign.create",
        "AiCampaign",
        campaign.id,
        {
          channelType,
          queuedCount,
          skippedCount,
          templateId: template.id,
        },
      );

      return updated;
    });
  }

  private async getActiveChannel(tenantId: string, channelId?: string) {
    if (!channelId) {
      throw new BadRequestException(
        "channelId is required for WhatsApp delivery",
      );
    }

    const channel = await this.prisma.aiChannel.findFirst({
      where: {
        id: channelId,
        tenantId,
        status: "active",
      },
      select: {
        id: true,
        tenantId: true,
        displayName: true,
        phoneNumber: true,
        agentIdDefault: true,
      },
    });

    if (!channel) {
      throw new NotFoundException("Active WhatsApp channel not found");
    }

    return channel;
  }

  private async resolveCampaignContacts(data: {
    tenantId: string;
    contactIds?: string[];
    audienceStatus?: string;
    directRecipient?: { phoneNumber?: string; email?: string };
  }) {
    if (data.directRecipient && !data.contactIds?.length) {
      return [];
    }

    if (data.contactIds?.length) {
      const uniqueIds = Array.from(new Set(data.contactIds));
      if (uniqueIds.length > maxCampaignRecipients) {
        throw new BadRequestException(
          `Campaign recipient limit is ${maxCampaignRecipients}`,
        );
      }

      const contacts = await this.prisma.crmContact.findMany({
        where: {
          tenantId: data.tenantId,
          id: { in: uniqueIds },
        },
        select: {
          id: true,
          fullName: true,
          phone: true,
          email: true,
          status: true,
        },
      });

      if (contacts.length !== uniqueIds.length) {
        throw new NotFoundException("One or more CRM contacts were not found");
      }

      return contacts;
    }

    if (!data.audienceStatus) {
      return [];
    }

    return this.prisma.crmContact.findMany({
      where: {
        tenantId: data.tenantId,
        status: data.audienceStatus,
      },
      orderBy: { lastContactAt: "desc" },
      take: maxCampaignRecipients,
      select: {
        id: true,
        fullName: true,
        phone: true,
        email: true,
        status: true,
      },
    });
  }

  private buildCampaignRecipients(input: {
    template: {
      provider: string;
      subject: string | null;
      body: string;
      variables: string[];
    };
    channelType: string;
    contacts: Array<{
      id: string;
      fullName: string | null;
      phone: string;
      email: string | null;
      status: string;
    }>;
    directRecipient?: { phoneNumber?: string; email?: string };
    variables?: Record<string, unknown>;
  }) {
    const recipients: Array<{
      contactId: string | null;
      phoneNumber: string | null;
      email: string | null;
      renderedSubject: string | null;
      renderedBody: string;
      providerVariables: Prisma.InputJsonValue;
      status: "queued" | "skipped";
      error: string | null;
    }> = input.contacts.map((contact) => {
      const variables = this.buildContactTemplateVariables(
        contact,
        input.variables,
      );
      const renderedSubject = this.renderTemplate(
        input.template.subject,
        variables,
      );
      const renderedBody =
        this.renderTemplate(input.template.body, variables) ?? "";
      const phoneNumber =
        input.channelType === "whatsapp"
          ? this.safeNormalizeE164(contact.phone)
          : null;
      const email = input.channelType === "email" ? contact.email : null;
      const missingDestination =
        input.channelType === "whatsapp" ? !phoneNumber : !email;

      return {
        contactId: contact.id,
        phoneNumber,
        email,
        renderedSubject,
        renderedBody,
        providerVariables: this.buildProviderVariables(
          input.channelType,
          input.template.provider,
          input.template.variables,
          variables,
        ),
        status: missingDestination ? "skipped" : "queued",
        error: missingDestination
          ? `Contact has no ${input.channelType === "whatsapp" ? "valid phone" : "email"}`
          : null,
      };
    });

    if (input.directRecipient) {
      const variables = this.buildContactTemplateVariables(
        null,
        input.variables,
      );
      const phoneNumber = input.directRecipient.phoneNumber
        ? this.safeNormalizeE164(input.directRecipient.phoneNumber)
        : null;
      const email = input.directRecipient.email?.trim() || null;
      const renderedSubject = this.renderTemplate(
        input.template.subject,
        variables,
      );
      const renderedBody =
        this.renderTemplate(input.template.body, variables) ?? "";
      const missingDestination =
        input.channelType === "whatsapp" ? !phoneNumber : !email;

      recipients.push({
        contactId: null,
        phoneNumber: input.channelType === "whatsapp" ? phoneNumber : null,
        email: input.channelType === "email" ? email : null,
        renderedSubject,
        renderedBody,
        providerVariables: this.buildProviderVariables(
          input.channelType,
          input.template.provider,
          input.template.variables,
          variables,
        ),
        status: missingDestination ? "skipped" : "queued",
        error: missingDestination
          ? `Notification has no ${input.channelType === "whatsapp" ? "valid phone" : "email"}`
          : null,
      });
    }

    return recipients;
  }

  private buildAudienceFilter(data: {
    contactIds?: string[];
    audienceStatus?: string;
    channelId?: string;
    variables?: Record<string, unknown>;
  }): Prisma.InputJsonValue {
    return JSON.parse(
      JSON.stringify({
        ...(data.contactIds?.length ? { contactIds: data.contactIds } : {}),
        ...(data.audienceStatus ? { audienceStatus: data.audienceStatus } : {}),
        ...(data.channelId ? { channelId: data.channelId } : {}),
        ...(data.variables ? { variables: data.variables } : {}),
      }),
    ) as Prisma.InputJsonValue;
  }

  private buildContactTemplateVariables(
    contact: {
      id: string;
      fullName: string | null;
      phone: string;
      email: string | null;
      status: string;
    } | null,
    variables?: Record<string, unknown>,
  ) {
    const fullName = contact?.fullName?.trim() || "";
    return {
      ...(variables ?? {}),
      contactId: contact?.id ?? "",
      fullName,
      firstName: fullName.split(" ")[0] ?? "",
      phone: contact?.phone ?? "",
      email: contact?.email ?? "",
      status: contact?.status ?? "",
    };
  }

  private buildProviderVariables(
    channelType: string,
    provider: string,
    variableNames: string[],
    values: Record<string, unknown>,
  ): Prisma.InputJsonValue {
    const variables =
      channelType === "whatsapp" && provider === "twilio"
        ? variableNames.reduce<Record<string, string>>(
            (accumulator, name, index) => {
              accumulator[String(index + 1)] = this.stringifyTemplateValue(
                values[name],
              );
              return accumulator;
            },
            {},
          )
        : variableNames.reduce<Record<string, string>>((accumulator, name) => {
            accumulator[name] = this.stringifyTemplateValue(values[name]);
            return accumulator;
          }, {});

    return JSON.parse(JSON.stringify(variables)) as Prisma.InputJsonValue;
  }

  private stringifyTemplateValue(value: unknown) {
    return value === undefined || value === null ? "" : String(value);
  }

  private renderTemplate(
    template: string | null,
    variables: Record<string, unknown>,
  ) {
    if (!template) {
      return null;
    }

    return template.replace(
      /\{\{\s*([\w.-]+)\s*\}\}/g,
      (_match, key: string) =>
        variables[key] === undefined || variables[key] === null
          ? ""
          : String(variables[key]),
    );
  }

  private extractTemplateVariables(subject: string | null, body: string) {
    const variables = new Set<string>();
    for (const template of [subject ?? "", body]) {
      for (const match of template.matchAll(/\{\{\s*([\w.-]+)\s*\}\}/g)) {
        variables.add(match[1]);
      }
    }
    return Array.from(variables);
  }

  private assertEmailTemplateSubject(
    channelType: string,
    subject?: string | null,
    providerTemplateId?: string | null,
  ) {
    if (channelType === "email" && !providerTemplateId && !subject?.trim()) {
      throw new BadRequestException("Email templates require a subject");
    }
  }

  private defaultMessagingProvider(channelType: string) {
    return channelType === "whatsapp" ? "twilio" : "brevo";
  }

  private assertTemplateProvider(
    channelType: string,
    provider: string,
    providerTemplateId?: string | null,
  ) {
    if (
      channelType === "whatsapp" &&
      provider !== "twilio" &&
      provider !== "sent_dm"
    ) {
      throw new BadRequestException(
        "WhatsApp templates must use Twilio or Sent.dm",
      );
    }

    if (channelType === "email" && provider !== "brevo") {
      throw new BadRequestException("Email templates must use Brevo");
    }

    if (channelType === "whatsapp" && !providerTemplateId?.trim()) {
      throw new BadRequestException(
        "WhatsApp templates require a provider template id",
      );
    }
  }

  private hasPlaybookVersionChanges(data: UpdatePlaybookDto) {
    return [
      data.title,
      data.type,
      data.category,
      data.stage,
      data.triggerPhrases,
      data.situation,
      data.responseStrategy,
      data.exampleResponse,
      data.rationale,
      data.nextStep,
      data.priority,
      data.tags,
      data.minScore,
    ].some((value) => value !== undefined);
  }

  private buildPlaybookSearchText(data: {
    title: string;
    category: string;
    situation: string;
    responseStrategy: string;
    exampleResponse: string;
  }) {
    return [
      data.title,
      data.category,
      data.situation,
      data.responseStrategy,
      data.exampleResponse,
    ].join("\n");
  }

  private safeNormalizeE164(value: string) {
    try {
      return this.normalizeE164(value);
    } catch {
      return null;
    }
  }

  private async assertTenantOperational(
    actorInput: AiPlatformActorInput,
    tenantId: string,
  ) {
    const actor = this.normalizeActor(actorInput);
    if (actor.type === "admin") {
      await this.tenantAccess.assertTenantAccess(actor.userId, tenantId);
    } else if (actor.tenantId !== tenantId) {
      throw new ForbiddenException("API token cannot access tenant");
    }

    const quota =
      await this.planLimitService.validateTenantRequestQuota(tenantId);
    if (quota.quotaExceeded) {
      throw new HttpException(
        {
          message: "monthly plan quota exceeded",
          plan: quota.plan,
          monthlyRequestLimit: quota.monthlyRequestLimit,
          currentMonthlyRequests: quota.currentMonthlyRequests,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return quota;
  }

  private async assertContact(tenantId: string, contactId: string) {
    const contact = await this.prisma.crmContact.findFirst({
      where: { id: contactId, tenantId },
      select: { id: true },
    });
    if (!contact) {
      throw new NotFoundException("CRM contact not found");
    }
    return contact;
  }

  private async getConversationByPhone(
    tenantId: string,
    phone: string,
    channelId?: string,
  ) {
    const phoneNumber = this.normalizeE164(decodeURIComponent(phone));
    const conversation = await this.prisma.aiConversation.findFirst({
      where: {
        tenantId,
        phoneNumber,
        ...(channelId ? { channelId } : {}),
      },
      include: {
        channel: true,
        crmContact: true,
      },
      orderBy: { lastMessageAt: "desc" },
    });

    if (!conversation) {
      throw new NotFoundException("Chat not found");
    }
    return conversation;
  }

  private async ensureDefaultPipeline(
    tx: Prisma.TransactionClient | PrismaService,
    tenantId: string,
  ) {
    let pipeline = await tx.crmPipeline.findUnique({
      where: {
        tenantId_key: {
          tenantId,
          key: "inbound",
        },
      },
    });

    if (!pipeline) {
      pipeline = await tx.crmPipeline.create({
        data: {
          tenantId,
          key: "inbound",
          name: "Inbound",
          description: "Default WhatsApp inbound CRM pipeline",
          sortOrder: 10,
        },
      });
    }

    let stage = await tx.crmStage.findUnique({
      where: {
        tenantId_pipelineId_key: {
          tenantId,
          pipelineId: pipeline.id,
          key: "new_lead",
        },
      },
    });

    if (!stage) {
      stage = await tx.crmStage.create({
        data: {
          tenantId,
          pipelineId: pipeline.id,
          key: "new_lead",
          name: "Novo lead",
          probability: 10,
          sortOrder: 10,
        },
      });

      await tx.crmStage.createMany({
        data: [
          {
            tenantId,
            pipelineId: pipeline.id,
            key: "qualified",
            name: "Qualificado",
            probability: 35,
            sortOrder: 20,
          },
          {
            tenantId,
            pipelineId: pipeline.id,
            key: "proposal_sent",
            name: "Proposta enviada",
            probability: 60,
            sortOrder: 30,
          },
          {
            tenantId,
            pipelineId: pipeline.id,
            key: "negotiation",
            name: "Negociação",
            probability: 75,
            sortOrder: 40,
          },
          {
            tenantId,
            pipelineId: pipeline.id,
            key: "won",
            name: "Fechado",
            probability: 100,
            sortOrder: 50,
          },
          {
            tenantId,
            pipelineId: pipeline.id,
            key: "lost",
            name: "Perdido",
            probability: 0,
            sortOrder: 60,
          },
        ],
        skipDuplicates: true,
      });
    }

    return { pipeline, stage };
  }

  private async createCrmActivity(
    tx: Prisma.TransactionClient,
    input: {
      tenantId: string;
      contactId?: string | null;
      pipelineId?: string | null;
      stageId?: string | null;
      channelId?: string | null;
      actorUserId?: string | null;
      type: string;
      direction?: string | null;
      title: string;
      body?: string | null;
      metadata?: Prisma.InputJsonValue;
    },
  ) {
    return tx.crmActivity.create({
      data: {
        tenantId: input.tenantId,
        contactId: input.contactId ?? null,
        pipelineId: input.pipelineId ?? null,
        stageId: input.stageId ?? null,
        channelId: input.channelId ?? null,
        actorUserId: input.actorUserId ?? null,
        type: input.type,
        direction: input.direction ?? null,
        title: input.title,
        body: input.body ?? null,
        metadata: input.metadata ?? undefined,
      },
    });
  }

  private async audit(
    tx: Prisma.TransactionClient | PrismaService,
    tenantId: string,
    actorInput: AiPlatformActorInput,
    action: string,
    entity: string,
    entityId?: string,
    metadata?: Prisma.InputJsonValue,
  ) {
    const actor = this.normalizeActor(actorInput);
    return tx.auditLog.create({
      data: {
        tenantId,
        actorUserId: this.actorUserId(actor),
        action,
        entity,
        entityId,
        metadata: this.actorMetadata(actor, metadata),
      },
    });
  }

  private normalizeActor(actor: AiPlatformActorInput): AiPlatformActor {
    if (typeof actor === "string") {
      return { type: "admin", userId: actor };
    }

    return actor;
  }

  private actorUserId(actor: AiPlatformActor) {
    return actor.type === "admin" ? actor.userId : null;
  }

  private actorReference(actor: AiPlatformActor) {
    return actor.type === "admin"
      ? actor.userId
      : `api-token:${actor.apiTokenId}`;
  }

  private actorMetadata(
    actor: AiPlatformActor,
    metadata?: Prisma.InputJsonValue,
  ): Prisma.InputJsonValue | undefined {
    if (actor.type === "admin") {
      return metadata ?? undefined;
    }

    const base =
      metadata && typeof metadata === "object" && !Array.isArray(metadata)
        ? (metadata as Record<string, unknown>)
        : {};
    const fallback =
      metadata && (typeof metadata !== "object" || Array.isArray(metadata))
        ? { metadataValue: metadata }
        : {};

    return JSON.parse(
      JSON.stringify({
        ...base,
        ...fallback,
        actorType: "api_token",
        apiTokenId: actor.apiTokenId,
        appId: actor.appId,
      }),
    ) as Prisma.InputJsonValue;
  }

  private assertKnownAgent(agentId: string) {
    if (!AGENT_IDS.has(agentId)) {
      throw new BadRequestException("Unknown agent id");
    }
  }

  private normalizeE164(value: string) {
    const phone = value.trim().replace(/^whatsapp:/, "");
    if (!/^\+\d{8,15}$/.test(phone)) {
      throw new BadRequestException(
        "Phone must be E.164, for example +5511999999999",
      );
    }
    return phone;
  }

  private normalizeWhatsappAddress(value: string) {
    return `whatsapp:${this.normalizeE164(value)}`;
  }

  private isUniqueConstraintError(error: unknown) {
    return Boolean(
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "P2002",
    );
  }
}
