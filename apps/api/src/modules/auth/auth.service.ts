import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async login(data: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await argon2.verify(user.passwordHash, data.password).catch(() => false);

    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return {
      accessToken: 'bootstrap-access-token',
      refreshToken: 'bootstrap-refresh-token',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  }
}
