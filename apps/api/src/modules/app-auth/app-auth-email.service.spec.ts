import { BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import { VaultService } from "../vault/vault.service";
import { AppAuthEmailService } from "./app-auth-email.service";

describe("AppAuthEmailService", () => {
  const prismaMock = {
    tenant: {
      findUnique: jest.fn(),
    },
    providerCredential: {
      findMany: jest.fn(),
    },
  };
  const vaultMock = {
    readSecret: jest.fn(),
  };
  const configValues: Record<string, string> = {
    RESEND_BASE_URL: "https://api.resend.com",
    RESEND_API_KEY: "re_test",
    RESEND_SENDER_EMAIL: "noreply@basix.dev",
    RESEND_SENDER_NAME: "Basix Core",
    BREVO_BASE_URL: "https://api.brevo.com/v3",
    PROVIDER_CREDENTIALS_FALLBACK_ENV: "false",
  };
  const configServiceMock = {
    get: jest.fn((key: string) => configValues[key]),
    getOrThrow: jest.fn((key: string) => configValues[key]),
  };
  const fetchMock = jest.fn();

  let service: AppAuthEmailService;

  beforeEach(() => {
    jest.clearAllMocks();
    configServiceMock.get.mockImplementation(
      (key: string) => configValues[key],
    );
    configServiceMock.getOrThrow.mockImplementation(
      (key: string) => configValues[key],
    );
    global.fetch = fetchMock as unknown as typeof fetch;
    fetchMock.mockResolvedValue({ ok: true });
    service = new AppAuthEmailService(
      prismaMock as unknown as PrismaService,
      vaultMock as unknown as VaultService,
      configServiceMock as unknown as ConfigService,
    );
  });

  it("sends transactional email through Resend by default", async () => {
    prismaMock.tenant.findUnique.mockResolvedValue({
      transactionalEmailProvider: "resend",
    });
    prismaMock.providerCredential.findMany.mockResolvedValue([]);

    await service.send({
      tenantId: "tenant-id",
      toEmail: "user@example.com",
      toName: "User",
      subject: "Verify your email",
      text: "Verify",
      html: "<p>Verify</p>",
    });

    expect(prismaMock.providerCredential.findMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        tenantId: "tenant-id",
        provider: "resend",
        scopeType: "tenant",
      }),
      select: {
        key: true,
        vaultSecretId: true,
      },
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        method: "POST",
        headers: {
          authorization: "Bearer re_test",
          "content-type": "application/json",
        },
      }),
    );

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body).toEqual({
      from: "Basix Core <noreply@basix.dev>",
      to: ["user@example.com"],
      subject: "Verify your email",
      html: "<p>Verify</p>",
      text: "Verify",
    });
  });

  it("uses Brevo credentials when the tenant selects Brevo", async () => {
    prismaMock.tenant.findUnique.mockResolvedValue({
      transactionalEmailProvider: "brevo",
    });
    prismaMock.providerCredential.findMany.mockResolvedValue([
      { key: "api_key", vaultSecretId: "vault-api-key" },
      { key: "sender_email", vaultSecretId: "vault-sender-email" },
      { key: "sender_name", vaultSecretId: "vault-sender-name" },
    ]);
    vaultMock.readSecret.mockImplementation((vaultSecretId: string) => {
      const secrets: Record<string, string> = {
        "vault-api-key": "brevo-key",
        "vault-sender-email": "tenant@example.com",
        "vault-sender-name": "Tenant Mail",
      };
      return Promise.resolve(secrets[vaultSecretId]);
    });

    await service.send({
      tenantId: "tenant-id",
      toEmail: "user@example.com",
      toName: "User",
      subject: "Invite",
      text: "Invite",
      html: "<p>Invite</p>",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.brevo.com/v3/smtp/email",
      expect.objectContaining({
        method: "POST",
        headers: {
          accept: "application/json",
          "api-key": "brevo-key",
          "content-type": "application/json",
        },
      }),
    );

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body).toEqual({
      sender: {
        email: "tenant@example.com",
        name: "Tenant Mail",
      },
      to: [
        {
          email: "user@example.com",
          name: "User",
        },
      ],
      subject: "Invite",
      htmlContent: "<p>Invite</p>",
      textContent: "Invite",
    });
  });

  it("requires configured Resend sender credentials", async () => {
    prismaMock.tenant.findUnique.mockResolvedValue({
      transactionalEmailProvider: "resend",
    });
    prismaMock.providerCredential.findMany.mockResolvedValue([]);
    configServiceMock.get.mockImplementation((key: string) => {
      if (key === "RESEND_API_KEY" || key === "RESEND_SENDER_EMAIL") {
        return "";
      }
      return configValues[key];
    });

    await expect(service.assertConfigured("tenant-id")).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
