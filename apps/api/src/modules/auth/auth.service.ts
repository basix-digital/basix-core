import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import crypto from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(data: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const passwordValid = await argon2.verify(user.passwordHash, data.password).catch(() => false);
    if (!passwordValid) throw new UnauthorizedException('Invalid credentials');

    return this.createSession(user.id, user.email, user.name);
  }

  async refreshSession(sessionValue: string) {
    const sessions = await this.prisma.refreshSession.findMany({
      where: {
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    for (const session of sessions) {
      const valid = await argon2.verify(session.tokenHash, sessionValue).catch(() => false);
      if (valid) {
        await this.prisma.refreshSession.update({
          where: { id: session.id },
          data: { revokedAt: new Date(), rotatedAt: new Date() },
        });

        const user = await this.prisma.user.findUnique({ where: { id: session.userId } });
        if (!user) throw new UnauthorizedException('Invalid session');

        return this.createSession(user.id, user.email, user.name);
      }
    }

    throw new UnauthorizedException('Invalid session');
  }

  async logout(sessionValue: string) {
    const sessions = await this.prisma.refreshSession.findMany({
      where: {
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    for (const session of sessions) {
      const valid = await argon2.verify(session.tokenHash, sessionValue).catch(() => false);
      if (valid) {
        await this.prisma.refreshSession.update({
          where: { id: session.id },
          data: { revokedAt: new Date() },
        });

        return { success: true };
      }
    }

    return { success: true };
  }

  private async createSession(userId: string, email: string, name: string | null) {
    const accessToken = await this.jwtService.signAsync({ sub: userId, email });
    const sessionValue = crypto.randomBytes(48).toString('hex');
    const sessionHash = await argon2.hash(sessionValue);

    await this.prisma.refreshSession.create({
      data: {
        userId,
        tokenHash: sessionHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      accessToken,
      sessionValue,
      user: { id: userId, email, name },
    };
  }
}
