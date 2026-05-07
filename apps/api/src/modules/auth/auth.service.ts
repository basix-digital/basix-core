import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as argon2 from "argon2";
import crypto from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import { LoginDto } from "./dto/login.dto";

const SESSION_TOKEN_ID_BYTES = 16;
const SESSION_TOKEN_SECRET_BYTES = 48;
const SESSION_VALUE_PATTERN = /^[a-f0-9]{32}\.[a-f0-9]{96}$/;
const REFRESH_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(data: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: data.email },
    });
    if (!user) throw new UnauthorizedException("Invalid credentials");

    const passwordValid = await argon2
      .verify(user.passwordHash, data.password)
      .catch(() => false);
    if (!passwordValid) throw new UnauthorizedException("Invalid credentials");

    return this.createSession(user.id, user.email, user.name);
  }

  async refreshSession(sessionValue: string) {
    const parsedSession = this.parseSessionValue(sessionValue);
    if (!parsedSession) throw new UnauthorizedException("Invalid session");

    const session = await this.prisma.refreshSession.findUnique({
      where: { tokenId: parsedSession.tokenId },
    });

    if (!session || session.revokedAt || session.expiresAt <= new Date()) {
      throw new UnauthorizedException("Invalid session");
    }

    const valid = await argon2
      .verify(session.tokenHash, parsedSession.secret)
      .catch(() => false);
    if (!valid) throw new UnauthorizedException("Invalid session");

    const rotatedAt = new Date();
    const revokedSession = await this.prisma.refreshSession.updateMany({
      where: {
        id: session.id,
        revokedAt: null,
        expiresAt: {
          gt: rotatedAt,
        },
      },
      data: { revokedAt: rotatedAt, rotatedAt },
    });
    if (revokedSession.count !== 1) {
      throw new UnauthorizedException("Invalid session");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: session.userId },
    });
    if (!user) throw new UnauthorizedException("Invalid session");

    return this.createSession(user.id, user.email, user.name);
  }

  async logout(sessionValue: string) {
    const parsedSession = this.parseSessionValue(sessionValue);
    if (!parsedSession) return { success: true };

    const session = await this.prisma.refreshSession.findUnique({
      where: { tokenId: parsedSession.tokenId },
    });

    if (!session || session.revokedAt || session.expiresAt <= new Date()) {
      return { success: true };
    }

    const valid = await argon2
      .verify(session.tokenHash, parsedSession.secret)
      .catch(() => false);
    if (!valid) return { success: true };

    await this.prisma.refreshSession.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    return { success: true };
  }

  private async createSession(
    userId: string,
    email: string,
    name: string | null,
  ) {
    const accessToken = await this.jwtService.signAsync({ sub: userId, email });
    const tokenId = crypto.randomBytes(SESSION_TOKEN_ID_BYTES).toString("hex");
    const secret = crypto
      .randomBytes(SESSION_TOKEN_SECRET_BYTES)
      .toString("hex");
    const sessionValue = `${tokenId}.${secret}`;
    const sessionHash = await argon2.hash(secret);

    await this.prisma.refreshSession.create({
      data: {
        userId,
        tokenId,
        tokenHash: sessionHash,
        expiresAt: new Date(Date.now() + REFRESH_SESSION_TTL_MS),
      },
    });

    return {
      accessToken,
      sessionValue,
      user: { id: userId, email, name },
    };
  }

  private parseSessionValue(sessionValue: string) {
    if (!SESSION_VALUE_PATTERN.test(sessionValue)) {
      return null;
    }

    const [tokenId, secret] = sessionValue.split(".");
    return { tokenId, secret };
  }
}
