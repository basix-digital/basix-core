# @basix-core/database

Version: `0.3.1`

Prisma schema, migrations, seed entrypoint, and generated client boundary for
Basix Core.

## Responsibilities

- Own the canonical Prisma schema.
- Store tenant-isolated control-plane models.
- Keep provider credential metadata in the core database while secrets stay in
  the separate Vault database.
- Provide the generated Prisma client used by `apps/api`.

## Local commands

From the repository root:

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:reset
pnpm --filter @basix-core/database test
```
