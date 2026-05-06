import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { REQUIRED_SCOPES_KEY } from "../decorators/scopes.decorator";
import { AuthenticatedRequest } from "../context/request-context.types";

@Injectable()
export class ScopesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredScopes =
      this.reflector.getAllAndOverride<string[]>(REQUIRED_SCOPES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    if (requiredScopes.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const tokenScopes = new Set(request.apiTokenScopes ?? []);
    const missingScopes = requiredScopes.filter(
      (scope) => !tokenScopes.has(scope),
    );

    if (missingScopes.length > 0) {
      throw new ForbiddenException("Insufficient API token scope");
    }

    return true;
  }
}
