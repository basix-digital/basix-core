import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import { VaultService } from "../vault/vault.service";
import {
  BrevoEmailAdapter,
  EmailCredentials,
  ResendEmailAdapter,
  TransactionalEmailProvider,
} from "./app-auth-email-adapters";

interface AppAuthEmailInput {
  tenantId: string;
  toEmail: string;
  toName?: string | null;
  subject: string;
  text: string;
  html: string;
}

const REQUIRED_EMAIL_KEYS = ["api_key", "sender_email"] as const;
const OPTIONAL_EMAIL_KEYS = ["sender_name"] as const;
const EMAIL_CREDENTIAL_KEYS = [
  ...REQUIRED_EMAIL_KEYS,
  ...OPTIONAL_EMAIL_KEYS,
] as const;
type EmailCredentialKey = (typeof EMAIL_CREDENTIAL_KEYS)[number];

const providerLabels: Record<TransactionalEmailProvider, string> = {
  resend: "Resend",
  brevo: "Brevo",
};

@Injectable()
export class AppAuthEmailService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vault: VaultService,
    private readonly configService: ConfigService,
  ) {}

  async send(input: AppAuthEmailInput) {
    const provider = await this.getTenantEmailProvider(input.tenantId);
    const credentials = await this.getEmailCredentials(
      input.tenantId,
      provider,
    );

    try {
      await this.createAdapter(provider).send(input, credentials);
    } catch {
      throw new ServiceUnavailableException(
        "Unable to send authentication email",
      );
    }
  }

  async assertConfigured(tenantId: string) {
    const provider = await this.getTenantEmailProvider(tenantId);
    await this.getEmailCredentials(tenantId, provider);
  }

  private async getTenantEmailProvider(
    tenantId: string,
  ): Promise<TransactionalEmailProvider> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { transactionalEmailProvider: true },
    });

    if (!tenant) {
      throw new BadRequestException("Tenant not found");
    }

    return this.normalizeProvider(tenant.transactionalEmailProvider);
  }

  private normalizeProvider(provider: string): TransactionalEmailProvider {
    if (provider === "brevo") {
      return "brevo";
    }

    return "resend";
  }

  private async getEmailCredentials(
    tenantId: string,
    provider: TransactionalEmailProvider,
  ): Promise<EmailCredentials> {
    const credentials = await this.prisma.providerCredential.findMany({
      where: {
        tenantId,
        provider,
        scopeType: "tenant",
        status: "active",
        key: {
          in: [...EMAIL_CREDENTIAL_KEYS],
        },
      },
      select: {
        key: true,
        vaultSecretId: true,
      },
    });

    const byKey = new Map(credentials.map((item) => [item.key, item]));
    const values = new Map<EmailCredentialKey, string>();

    for (const key of EMAIL_CREDENTIAL_KEYS) {
      const credential = byKey.get(key);
      if (!credential) {
        continue;
      }

      const secret =
        key === "sender_name"
          ? ((await this.vault.readSecret(credential.vaultSecretId)) ?? "")
          : await this.readRequiredSecret(provider, credential.vaultSecretId);
      if (secret) {
        values.set(key, secret);
      }
    }

    if (this.shouldReadEnvFallback(provider)) {
      for (const key of EMAIL_CREDENTIAL_KEYS) {
        if (!values.has(key)) {
          const fallback = this.readEnvFallback(provider, key);
          if (fallback) {
            values.set(key, fallback);
          }
        }
      }
    }

    for (const key of REQUIRED_EMAIL_KEYS) {
      if (!values.has(key)) {
        throw new BadRequestException(this.missingCredentialsMessage(provider));
      }
    }

    const senderName = values.get("sender_name") || "";

    return {
      apiKey: values.get("api_key")!,
      senderEmail: values.get("sender_email")!,
      senderName: senderName || undefined,
    };
  }

  private shouldReadEnvFallback(provider: TransactionalEmailProvider) {
    return (
      provider === "resend" ||
      this.configService.get<string>("PROVIDER_CREDENTIALS_FALLBACK_ENV") ===
        "true"
    );
  }

  private readEnvFallback(
    provider: TransactionalEmailProvider,
    key: EmailCredentialKey,
  ) {
    const envNames: Record<
      TransactionalEmailProvider,
      Record<EmailCredentialKey, string>
    > = {
      resend: {
        api_key: "RESEND_API_KEY",
        sender_email: "RESEND_SENDER_EMAIL",
        sender_name: "RESEND_SENDER_NAME",
      },
      brevo: {
        api_key: "BREVO_API_KEY",
        sender_email: "BREVO_SENDER_EMAIL",
        sender_name: "BREVO_SENDER_NAME",
      },
    };

    return (
      this.configService.get<string>(envNames[provider][key])?.trim() ?? ""
    );
  }

  private createAdapter(provider: TransactionalEmailProvider) {
    if (provider === "brevo") {
      return new BrevoEmailAdapter(
        this.configService.getOrThrow<string>("BREVO_BASE_URL"),
      );
    }

    return new ResendEmailAdapter(
      this.configService.getOrThrow<string>("RESEND_BASE_URL"),
    );
  }

  private missingCredentialsMessage(provider: TransactionalEmailProvider) {
    return `${providerLabels[provider]} credentials are required for App Auth emails`;
  }

  private async readRequiredSecret(
    provider: TransactionalEmailProvider,
    vaultSecretId: string,
  ) {
    const secret = await this.vault.readSecret(vaultSecretId);
    if (!secret) {
      throw new BadRequestException(this.missingCredentialsMessage(provider));
    }

    return secret;
  }
}
