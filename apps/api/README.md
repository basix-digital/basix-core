# Basix Core API

Version: `0.3.1`

NestJS control-plane API for Basix Core.

## Responsibilities

- Admin authentication with JWT access tokens and rotated refresh sessions.
- Tenant, tenant membership, app, API token, and scope management.
- Tenant-safe access checks through guards and context services.
- Audit logs, API events, usage metrics, quota reporting, and billing
  foundations.
- AI Platform management for channels, agents, chats, CRM contacts, playbooks,
  templates, campaigns, queue, and metrics.
- Provider credential administration backed by the separate Vault database.

## Security model

- Admin routes use `JwtAdminGuard`.
- App/runtime routes use `ApiTokenGuard` where applicable.
- Tenant access is validated server-side with `TenantAccessService`.
- API tokens are hashed with Argon2 and returned only once at creation.
- Provider secrets are stored in Vault; API responses return metadata only.

## Local commands

From the repository root:

```bash
pnpm --filter @basix-core/api dev
pnpm --filter @basix-core/api test
pnpm --filter @basix-core/api lint
pnpm --filter @basix-core/api build
```

Generate Prisma client before running API tests in a fresh checkout:

```bash
pnpm db:generate
```
