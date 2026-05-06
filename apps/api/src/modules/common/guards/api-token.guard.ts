import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { AuthenticatedRequest } from "../context/request-context.types";
import { TenantContextService } from "../context/tenant-context.service";

@Injectable()
export class ApiTokenGuard implements CanActivate {
  constructor(private readonly tenantContext: TenantContextService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractApiToken(request);
    if (!token) {
      throw new UnauthorizedException("Missing API token");
    }

    const tenantContext = await this.tenantContext.resolveFromApiToken(token);
    request.tenantId = tenantContext.tenantId;
    request.appId = tenantContext.appId;
    request.apiTokenId = tenantContext.apiTokenId;

    this.tenantContext.touchApiToken(tenantContext.apiTokenId);

    return true;
  }

  private extractApiToken(request: AuthenticatedRequest) {
    const header = request.headers["x-api-key"];
    if (Array.isArray(header)) {
      return header[0] ?? null;
    }

    return header ?? null;
  }
}
