# @basix-core/vault

Version: `0.3.1`

Internal package for accessing the separate Supabase Vault database.

This package uses direct PostgreSQL access instead of Prisma because the Vault
database is intentionally isolated from the core control-plane database.

## Public API

- `createSecret({ name, secret, description })`
- `updateSecret({ vaultSecretId, secret, name, description })`
- `readSecret(vaultSecretId)`
- `deleteSecret(vaultSecretId)`
- `assertVaultReady()`

## Rules

- Never log secret values.
- Never expose Vault secret identifiers in public or admin DTOs.
- Keep `VAULT_DATABASE_URL` scoped to trusted server runtimes only.
- Use the package from backend services, not browser code.

## Local commands

From the repository root:

```bash
pnpm --filter @basix-core/vault test
pnpm --filter @basix-core/vault build
pnpm --filter @basix-core/vault lint
```
