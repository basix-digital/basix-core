import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { AuthenticatedRequest } from "../context/request-context.types";

export const TenantContext = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    return {
      tenantId: request.tenantId,
      appId: request.appId,
      apiTokenId: request.apiTokenId,
    };
  },
);
