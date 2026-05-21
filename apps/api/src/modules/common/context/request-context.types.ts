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

export interface AppUserJwtPayload {
  typ: "app_user";
  sub: string;
  email: string;
  tenantId: string;
  appId: string;
  scopes: string[];
  iat?: number;
  exp?: number;
}

export interface CurrentAppUser {
  id: string;
  email: string;
  name: string | null;
  tenantId: string;
  appId: string;
  scopes: string[];
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
  appUser?: CurrentAppUser;
  tenantId?: string;
  tenantRole?: string;
  appId?: string;
  apiTokenId?: string;
  apiTokenScopes?: string[];
}
