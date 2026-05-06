export enum TenantRole {
  OWNER = "OWNER",
  ADMIN = "ADMIN",
}

export const TENANT_ADMIN_ROLES = [TenantRole.OWNER, TenantRole.ADMIN] as const;
