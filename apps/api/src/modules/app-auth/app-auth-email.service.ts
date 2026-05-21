import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import { VaultService } from "../vault/vault.service";

interface BrevoCredentials {
  apiKey: string;
  senderEmail: string;
  senderName?: string;
}

interface AppAuthEmailInput {
  tenantId: string;
  toEmail: string;
  toName?: string | null;
  subject: string;
  text: string;
  html: string;
}

const REQUIRED_BREVO_KEYS = ["api_key", "sender_email"] as const;
const OPTIONAL_BREVO_KEYS = ["sender_name"] as const;

@Injectable()
export class AppAuthEmailService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vault: VaultService,
    private readonly configService: ConfigService,
  ) {}

  async send(input: AppAuthEmailInput) {
    const credentials = await this.getBrevoCredentials(input.tenantId);
    const response = await fetch(
      `${this.configService.getOrThrow<string>("BREVO_BASE_URL").replace(/\/$/, "")}/smtp/email`,
      {
        method: "POST",
        headers: {
          accept: "application/json",
          "api-key": credentials.apiKey,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          sender: {
            email: credentials.senderEmail,
            name: credentials.senderName || "Basix Core",
          },
          to: [
            {
              email: input.toEmail,
              ...(input.toName ? { name: input.toName } : {}),
            },
          ],
          subject: input.subject,
          htmlContent: input.html,
          textContent: input.text,
        }),
      },
    ).catch(() => null);

    if (!response?.ok) {
      throw new ServiceUnavailableException(
        "Unable to send authentication email",
      );
    }
  }

  async assertConfigured(tenantId: string) {
    await this.getBrevoCredentials(tenantId);
  }

  private async getBrevoCredentials(
    tenantId: string,
  ): Promise<BrevoCredentials> {
    const credentials = await this.prisma.providerCredential.findMany({
      where: {
        tenantId,
        provider: "brevo",
        scopeType: "tenant",
        status: "active",
        key: {
          in: [...REQUIRED_BREVO_KEYS, ...OPTIONAL_BREVO_KEYS],
        },
      },
      select: {
        key: true,
        vaultSecretId: true,
      },
    });

    const byKey = new Map(credentials.map((item) => [item.key, item]));
    for (const key of REQUIRED_BREVO_KEYS) {
      if (!byKey.has(key)) {
        throw new BadRequestException(
          "Brevo tenant credentials are required for App Auth emails",
        );
      }
    }

    const apiKey = await this.readRequiredSecret(
      byKey.get("api_key")!.vaultSecretId,
    );
    const senderEmail = await this.readRequiredSecret(
      byKey.get("sender_email")!.vaultSecretId,
    );
    const senderNameCredential = byKey.get("sender_name");
    const senderName = senderNameCredential
      ? ((await this.vault.readSecret(senderNameCredential.vaultSecretId)) ??
        "")
      : "";

    return {
      apiKey,
      senderEmail,
      senderName: senderName || undefined,
    };
  }

  private async readRequiredSecret(vaultSecretId: string) {
    const secret = await this.vault.readSecret(vaultSecretId);
    if (!secret) {
      throw new BadRequestException(
        "Brevo tenant credentials are required for App Auth emails",
      );
    }

    return secret;
  }
}
