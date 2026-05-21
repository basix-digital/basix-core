import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import {
  AppUserJwtPayload,
  AuthenticatedRequest,
} from "../common/context/request-context.types";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AppUserJwtGuard implements CanActivate {
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
    const appUser = await this.prisma.appUser.findFirst({
      where: {
        id: payload.sub,
        email: payload.email,
        tenantId: payload.tenantId,
        appId: payload.appId,
        status: "active",
        tenant: { status: "active" },
        app: { status: "active" },
      },
      select: {
        id: true,
        email: true,
        name: true,
        tenantId: true,
        appId: true,
        scopes: true,
      },
    });

    if (!appUser) {
      throw new UnauthorizedException("Invalid bearer token");
    }

    request.appUser = appUser;
    request.tenantId = appUser.tenantId;
    request.appId = appUser.appId;
    request.apiTokenScopes = appUser.scopes;

    return true;
  }

  private async verifyToken(token: string) {
    try {
      const payload = await this.jwtService.verifyAsync<AppUserJwtPayload>(
        token,
        {
          secret: this.configService.getOrThrow<string>("JWT_ACCESS_SECRET"),
        },
      );

      if (
        payload.typ !== "app_user" ||
        !payload.sub ||
        !payload.email ||
        !payload.tenantId ||
        !payload.appId ||
        !Array.isArray(payload.scopes)
      ) {
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
