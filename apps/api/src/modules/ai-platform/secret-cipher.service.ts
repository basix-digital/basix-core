import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import crypto from "node:crypto";
import type { Prisma } from "@basix-core/database";

@Injectable()
export class SecretCipherService {
  constructor(private readonly configService: ConfigService) {}

  encryptJson(value: Record<string, unknown> | undefined) {
    if (!value || Object.keys(value).length === 0) {
      return null;
    }

    const secret = this.configService.get<string>("AI_AGENT_SECRET_KEY");
    if (!secret) {
      throw new BadRequestException(
        "AI_AGENT_SECRET_KEY is required to store channel secrets",
      );
    }

    const iv = crypto.randomBytes(12);
    const key = crypto.createHash("sha256").update(secret).digest();
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    const plaintext = Buffer.from(JSON.stringify(value), "utf8");
    const ciphertext = Buffer.concat([
      cipher.update(plaintext),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();

    return {
      algorithm: "aes-256-gcm",
      iv: iv.toString("base64"),
      tag: tag.toString("base64"),
      ciphertext: ciphertext.toString("base64"),
    } satisfies Prisma.InputJsonObject;
  }
}
