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

## AI API token routes

External apps can call AI Platform routes with `x-api-key`. These routes infer
`tenantId` from the token and reject client-supplied `tenantId` fields.

- `/api/ai/crm/contacts`, `/api/ai/crm/pipelines`: `ai:crm:read`,
  `ai:crm:write`
- `/api/ai/chats`: `ai:chats:read`, `ai:chats:write`
- `/api/ai/channels`: `ai:channels:read`, `ai:channels:write`
- `/api/ai/agents`: `ai:agents:read`, `ai:agents:write`
- `/api/ai/playbooks`: `ai:playbooks:read`, `ai:playbooks:write`
- `/api/ai/message-templates`, `/api/ai/campaigns`,
  `/api/ai/notifications`: `ai:campaigns:read`, `ai:campaigns:write`
- `/api/ai/queue`: `ai:queue:read`
- `/api/ai/activities`: `ai:activities:read`

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
