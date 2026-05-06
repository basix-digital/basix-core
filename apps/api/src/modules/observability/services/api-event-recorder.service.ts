import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import crypto from "node:crypto";
import { PrismaService } from "../../prisma/prisma.service";

export interface ApiEventRecordInput {
  tenantId: string;
  appId: string | null;
  tokenId: string | null;
  requestId: string;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  ip: string | null;
  userAgent: string | null;
}

const MAX_USER_AGENT_LENGTH = 500;

@Injectable()
export class ApiEventRecorderService {
  private readonly logger = new Logger(ApiEventRecorderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  recordAsync(input: ApiEventRecordInput) {
    void this.prisma.apiEvent
      .create({
        data: {
          tenantId: input.tenantId,
          appId: input.appId,
          tokenId: input.tokenId,
          requestId: input.requestId,
          method: input.method,
          path: input.path,
          statusCode: input.statusCode,
          durationMs: input.durationMs,
          ipHash: input.ip ? this.hashIp(input.ip) : null,
          userAgent: this.truncateUserAgent(input.userAgent),
        },
      })
      .catch((error: unknown) => {
        this.logger.warn(
          `Failed to persist API event: ${error instanceof Error ? error.message : "unknown error"}`,
        );
      });
  }

  private hashIp(ip: string) {
    return crypto
      .createHmac("sha256", this.getHashSecret())
      .update(ip)
      .digest("hex");
  }

  private getHashSecret() {
    return (
      this.configService.get<string>("OBSERVABILITY_HASH_SECRET") ||
      this.configService.getOrThrow<string>("JWT_ACCESS_SECRET")
    );
  }

  private truncateUserAgent(userAgent: string | null) {
    if (!userAgent) {
      return null;
    }

    return userAgent.slice(0, MAX_USER_AGENT_LENGTH);
  }
}
