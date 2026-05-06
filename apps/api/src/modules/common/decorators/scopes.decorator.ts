import { SetMetadata } from "@nestjs/common";

export const REQUIRED_SCOPES_KEY = "requiredApiTokenScopes";

export const Scopes = (...scopes: string[]) =>
  SetMetadata(REQUIRED_SCOPES_KEY, scopes);

export const RequireScopes = Scopes;
