import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module";
import { ObservabilityModule } from "../observability/observability.module";
import { PrismaModule } from "../prisma/prisma.module";
import { AgentsController } from "./agents.controller";
import { AiMetricsController } from "./ai-metrics.controller";
import { AiPlatformApiTokenController } from "./ai-platform-api-token.controller";
import { AiPlatformService } from "./ai-platform.service";
import { ChannelsController } from "./channels.controller";
import { ChatsController } from "./chats.controller";
import { CrmController } from "./crm.controller";
import { MessagingController } from "./messaging.controller";
import { PlaybooksController } from "./playbooks.controller";
import { QueueController } from "./queue.controller";
import { SecretCipherService } from "./secret-cipher.service";

@Module({
  imports: [CommonModule, PrismaModule, ObservabilityModule],
  controllers: [
    CrmController,
    ChannelsController,
    ChatsController,
    AgentsController,
    PlaybooksController,
    MessagingController,
    QueueController,
    AiMetricsController,
    AiPlatformApiTokenController,
  ],
  providers: [AiPlatformService, SecretCipherService],
})
export class AiPlatformModule {}
