import { ForbiddenException } from "@nestjs/common";
import { TenantAccessService } from "../common/context/tenant-access.service";
import { PlanLimitService } from "../observability/services/plan-limit.service";
import { PrismaService } from "../prisma/prisma.service";
import { AiPlatformService } from "./ai-platform.service";
import { SecretCipherService } from "./secret-cipher.service";

describe("AiPlatformService", () => {
  const prismaMock = {
    $transaction: jest.fn(),
    aiCampaign: {
      create: jest.fn(),
      update: jest.fn(),
    },
    aiCampaignRecipient: {
      create: jest.fn(),
    },
    aiChannel: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
    aiConversation: {
      upsert: jest.fn(),
    },
    aiManualMessage: {
      create: jest.fn(),
    },
    aiMessageTemplate: {
      findFirst: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    crmActivity: {
      create: jest.fn(),
    },
    crmContact: {
      findMany: jest.fn(),
    },
  };

  const tenantAccessMock = {
    assertTenantAccess: jest.fn(),
  };
  const planLimitMock = {
    validateTenantRequestQuota: jest.fn(),
  };
  const cipherMock = {
    encryptJson: jest.fn(),
  };

  let service: AiPlatformService;

  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.$transaction.mockImplementation((callback) =>
      callback(prismaMock),
    );
    planLimitMock.validateTenantRequestQuota.mockResolvedValue({
      quotaExceeded: false,
      plan: "pro",
      monthlyRequestLimit: 100000,
      currentMonthlyRequests: 100,
    });
    service = new AiPlatformService(
      prismaMock as unknown as PrismaService,
      tenantAccessMock as unknown as TenantAccessService,
      planLimitMock as unknown as PlanLimitService,
      cipherMock as unknown as SecretCipherService,
    );
  });

  it("does not create channels when the admin has no tenant access", async () => {
    tenantAccessMock.assertTenantAccess.mockRejectedValue(
      new ForbiddenException("Tenant access denied"),
    );

    await expect(
      service.createChannel("user-id", {
        tenantId: "tenant-id",
        displayName: "Inbound",
        phoneNumber: "+5511999999999",
        agentIdDefault: "sdr_assistant",
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prismaMock.aiChannel.create).not.toHaveBeenCalled();
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("queues WhatsApp campaign recipients inside the selected tenant", async () => {
    tenantAccessMock.assertTenantAccess.mockResolvedValue(undefined);
    prismaMock.aiMessageTemplate.findFirst.mockResolvedValue({
      id: "template-id",
      tenantId: "tenant-id",
      name: "Follow up",
      channelType: "whatsapp",
      subject: null,
      body: "Oi {{firstName}}, vamos conversar?",
      variables: ["firstName"],
      status: "active",
    });
    prismaMock.aiChannel.findFirst.mockResolvedValue({
      id: "channel-id",
      tenantId: "tenant-id",
      displayName: "Inbound",
      phoneNumber: "whatsapp:+5511888888888",
      agentIdDefault: "sdr_assistant",
    });
    prismaMock.crmContact.findMany.mockResolvedValue([
      {
        id: "contact-id",
        fullName: "Maria Silva",
        phone: "+5511999999999",
        email: "maria@example.com",
        status: "new",
      },
    ]);
    prismaMock.aiCampaign.create.mockResolvedValue({
      id: "campaign-id",
      tenantId: "tenant-id",
    });
    prismaMock.aiConversation.upsert.mockResolvedValue({
      id: "conversation-id",
    });
    prismaMock.aiManualMessage.create.mockResolvedValue({ id: "manual-id" });
    prismaMock.aiCampaign.update.mockResolvedValue({
      id: "campaign-id",
      tenantId: "tenant-id",
      status: "queued",
    });

    await service.createCampaign("user-id", {
      tenantId: "tenant-id",
      templateId: "template-id",
      name: "Activation",
      channelId: "channel-id",
      audienceStatus: "new",
    });

    expect(prismaMock.crmContact.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          tenantId: "tenant-id",
          status: "new",
        },
      }),
    );
    expect(prismaMock.aiManualMessage.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: "tenant-id",
        channelId: "channel-id",
        conversationId: "conversation-id",
        crmContactId: "contact-id",
        phoneNumber: "+5511999999999",
        body: "Oi Maria, vamos conversar?",
      }),
      select: { id: true },
    });
    expect(prismaMock.aiCampaignRecipient.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: "tenant-id",
        campaignId: "campaign-id",
        contactId: "contact-id",
        channelId: "channel-id",
        manualMessageId: "manual-id",
        status: "queued",
      }),
    });
  });
});
