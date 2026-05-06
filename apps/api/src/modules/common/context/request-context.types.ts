import type { Request } from "express";

export interface JwtAdminPayload {
  sub: string;
  email: string;
  iat?: number;
  exp?: number;
}

export interface JwtAdminUser {
  id: string;
  email: string;
  name: string | null;
}

export interface ApiTokenTenantContext {
  tenantId: string;
  appId: string;
  apiTokenId: string;
  apiTokenScopes: string[];
  apiTokenLastUsedAt: Date | null;
}

export interface AuthenticatedRequest extends Request {
  user?: JwtAdminUser;
  tenantId?: string;
  tenantRole?: string;
  appId?: string;
  apiTokenId?: string;
  apiTokenScopes?: string[];
}
