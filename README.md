# Basix Core

Basix Core is the multi-tenant SaaS control plane for Basix Digital products.

It provides the shared operational foundation for multiple SaaS applications:
admin authentication, tenant management, app registration, API token access,
usage tracking, billing foundations, AI agent operations, and provider
credential management.

## Current release

Basix Core `v0.3.1` is a patch release that aligns package versions and
documentation after the `v0.3.0` Agent Platform and Vault release.

The current platform includes:

- NestJS control-plane API.
- Next.js admin console.
- PostgreSQL and Prisma for the core database.
- Tenant, app, API token, scope, audit log, observability, usage metric,
  enforcement, and billing modules.
- AI Platform admin APIs for channels, agents, chats, CRM contacts, playbooks,
  templates, campaigns, queue, and metrics.
- FastAPI agent engine for Twilio WhatsApp webhooks, async agent execution,
  Brevo email delivery, Twilio WhatsApp templates, and OpenRouter-backed LLM
  calls through provider adapters.
- Separate Postgres Vault database with `pgsodium` and `supabase_vault`.
- Internal `@basix-core/vault` package for reading and writing provider secrets
  without storing secret values in the core database.

## Architecture

Basix Core starts as a modular monolith and only splits into separate services
where there is a clear operational boundary.

Core boundaries:

- `apps/api` owns transactional control-plane behavior.
- `apps/web` owns the admin console UI and browser session boundary.
- `apps/agent-engine` owns runtime agent execution and provider delivery.
- `packages/database` owns Prisma schema, migrations, and generated client.
- `packages/vault` owns direct access to the separate Vault database.
- `packages/shared` owns shared contracts and validation helpers.

Tenant isolation is mandatory. Backend code must derive tenant context from a
trusted server-side source, such as JWT admin membership or API token binding.
Frontend-provided `tenantId` values are treated as selectors only and must be
validated through server-side access checks.

## Monorepo structure

```txt
apps/
  api/            # NestJS control-plane API
  web/            # Next.js Basix Core Console
  agent-engine/   # FastAPI agent runtime and workers
  admin/          # Legacy placeholder, replaced by apps/web
  agents-api/     # Legacy placeholder, replaced by apps/agent-engine

packages/
  database/       # Prisma schema, migrations, and database client
  shared/         # Shared contracts and validation helpers
  vault/          # Internal Supabase Vault client

infra/
  postgres-vault/ # Custom Postgres image and init scripts for Vault
```

## Local development

Install dependencies:

```bash
pnpm install
```

Create a local `.env` from `.env.example`, then generate Prisma artifacts:

```bash
pnpm db:generate
```

Start the monorepo dev processes:

```bash
pnpm dev
```

Run the main quality gates:

```bash
pnpm test
pnpm lint
pnpm build
```

Run the agent engine tests separately:

```bash
cd apps/agent-engine
python3 -m pytest tests
```

## Local Vault database

The provider credentials Vault runs as a separate Postgres service with
`pgsodium` and `supabase_vault` installed in a custom image.

Build and start only the Vault database:

```bash
pnpm docker:vault:build
pnpm docker:vault:up
```

If a previous local boot failed during init, or if the Vault volume was created
before the app role had delete permissions, reset only the Vault containers and
volumes before starting again:

```bash
docker compose rm -sf vault-postgres
docker volume rm basix-core_vault_postgres_data basix-core_vault_pgsodium_keys
pnpm docker:vault:build
pnpm docker:vault:up
```

Check that the extensions were initialized and that a secret can be encrypted,
decrypted, and removed:

```bash
pnpm docker:vault:smoke
```

Open a psql shell:

```bash
pnpm docker:vault:psql
```

The Vault connection string for local development is:

```txt
VAULT_DATABASE_URL="postgresql://basix_vault_app:basix_vault_app@localhost:5433/basix_vault"
```

The pgsodium root key is persisted in the `vault_pgsodium_keys` Docker volume.
Do not commit generated key files or copy production Vault keys into local
development.

## Security principles

Security is not an afterthought in this project. Every module must enforce tenant isolation, least privilege, secure token handling, auditability, and safe defaults.

## Local Vault database

The provider credentials Vault runs as a separate Postgres service with
`pgsodium` and `supabase_vault` installed in a custom image.

Build and start only the Vault database:

```bash
pnpm docker:vault:build
pnpm docker:vault:up
```

If a previous local boot failed during init, or if the Vault volume was created
before the app role had delete permissions, reset only the Vault containers and
volumes before starting again:

```bash
docker compose rm -sf vault-postgres
docker volume rm basix-core_vault_postgres_data basix-core_vault_pgsodium_keys
pnpm docker:vault:build
pnpm docker:vault:up
```

Check that the extensions were initialized and that a secret can be encrypted,
decrypted, and removed:

```bash
pnpm docker:vault:smoke
```

Open a psql shell:

```bash
pnpm docker:vault:psql
```

The Vault connection string for local development is:

```txt
VAULT_DATABASE_URL="postgresql://basix_vault_app:basix_vault_app@localhost:5433/basix_vault"
```

The pgsodium root key is persisted in the `vault_pgsodium_keys` Docker volume.
Do not commit generated key files or copy production Vault keys into local
development.
- Never expose token hashes, refresh token hashes, provider secrets, or Vault
  secret identifiers in administrative DTOs.
- Never store raw provider secrets in the core database.
- Never store raw IP addresses in usage events.
- Validate every admin operation through tenant membership.
- Treat the Vault database as a separate blast-radius boundary.
- Keep `.env` provider fallback disabled outside local development.
