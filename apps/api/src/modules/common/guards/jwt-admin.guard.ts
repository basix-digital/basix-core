import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../../prisma/prisma.service";
import {
  AuthenticatedRequest,
  JwtAdminPayload,
} from "../context/request-context.types";

@Injectable()
export class JwtAdminGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractBearerToken(request);
    if (!token) {
      throw new UnauthorizedException("Missing bearer token");
    }

    const payload = await this.verifyToken(token);

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
      },
    });

    if (!user || user.status !== "active" || user.email !== payload.email) {
      throw new UnauthorizedException("Invalid bearer token");
    }

    request.user = {
      id: user.id,
      email: user.email,
      name: user.name,
    };

    return true;
  }

  private async verifyToken(token: string) {
    try {
      const payload = await this.jwtService.verifyAsync<JwtAdminPayload>(
        token,
        {
          secret: this.configService.getOrThrow<string>("JWT_ACCESS_SECRET"),
        },
      );

      if (!payload.sub || !payload.email) {
        throw new UnauthorizedException("Invalid bearer token");
      }

      return payload;
    } catch {
      throw new UnauthorizedException("Invalid bearer token");
    }
  }

  private extractBearerToken(request: AuthenticatedRequest) {
    const header = request.headers.authorization;
    if (!header) {
      return null;
    }

    const [type, token] = header.split(" ");
    return type === "Bearer" && token ? token : null;
  }
}
