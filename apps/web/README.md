# Basix Core Console

Version: `0.3.1`

Next.js App Router admin console for Basix Core.

## Responsibilities

- Admin login and logout.
- Protected console routes backed by server-side session checks.
- Dashboard overview for tenants, subscriptions, invoices, requests, and quota
  warnings.
- Tenant, app, billing, usage, and AI Platform management screens.
- API proxy routes that keep backend tokens in HTTP-only cookies instead of
  browser local storage.

## Architecture

- Server Components fetch protected data through `src/lib/api/server.ts`.
- Client mutations use route handlers under `src/app/api/console`.
- TanStack Query owns browser-side cache and refetch behavior.
- React Hook Form and Zod are used for validated forms.
- Recharts powers dashboard visualizations.
- Shared UI components live under `src/components/ui`.

## Local commands

From the repository root:

```bash
pnpm --filter @basix-core/web dev
pnpm --filter @basix-core/web test
pnpm --filter @basix-core/web lint
pnpm --filter @basix-core/web build
```

The console runs on port `3001` by default.
