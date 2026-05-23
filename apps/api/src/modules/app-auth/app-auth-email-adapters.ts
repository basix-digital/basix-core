export type TransactionalEmailProvider = "resend" | "brevo";

export interface EmailCredentials {
  apiKey: string;
  senderEmail: string;
  senderName?: string;
}

export interface TransactionalEmailMessage {
  toEmail: string;
  toName?: string | null;
  subject: string;
  text: string;
  html: string;
}

export interface TransactionalEmailAdapter {
  send(
    message: TransactionalEmailMessage,
    credentials: EmailCredentials,
  ): Promise<void>;
}

const DEFAULT_SENDER_NAME = "Basix Core";

export class ResendEmailAdapter implements TransactionalEmailAdapter {
  constructor(private readonly baseUrl: string) {}

  async send(
    message: TransactionalEmailMessage,
    credentials: EmailCredentials,
  ) {
    const response = await fetch(`${this.normalizeBaseUrl()}/emails`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${credentials.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: this.formatSender(credentials),
        to: [message.toEmail],
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
    }).catch(() => null);

    if (!response?.ok) {
      throw new Error("Resend email delivery failed");
    }
  }

  private normalizeBaseUrl() {
    return this.baseUrl.replace(/\/$/, "");
  }

  private formatSender(credentials: EmailCredentials) {
    const senderName = credentials.senderName || DEFAULT_SENDER_NAME;
    return `${senderName} <${credentials.senderEmail}>`;
  }
}

export class BrevoEmailAdapter implements TransactionalEmailAdapter {
  constructor(private readonly baseUrl: string) {}

  async send(
    message: TransactionalEmailMessage,
    credentials: EmailCredentials,
  ) {
    const response = await fetch(`${this.normalizeBaseUrl()}/smtp/email`, {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": credentials.apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          email: credentials.senderEmail,
          name: credentials.senderName || DEFAULT_SENDER_NAME,
        },
        to: [
          {
            email: message.toEmail,
            ...(message.toName ? { name: message.toName } : {}),
          },
        ],
        subject: message.subject,
        htmlContent: message.html,
        textContent: message.text,
      }),
    }).catch(() => null);

    if (!response?.ok) {
      throw new Error("Brevo email delivery failed");
    }
  }

  private normalizeBaseUrl() {
    return this.baseUrl.replace(/\/$/, "");
  }
}
