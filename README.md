# Basix Core

Basix Core is the central platform for Basix Digital SaaS products.

It is designed as a secure modular monolith that provides shared capabilities for multiple SaaS applications, including tenant management, app registration, API tokens, usage events, basic observability, and future shared modules such as scheduling, commerce, inventory, coupons, and AI agents.

## Vision

Every new SaaS should not need to recreate authentication, tenant management, API access, usage tracking, or operational foundations from scratch.

Basix Core allows each SaaS to connect to a central platform using secure credentials and consume shared services through APIs.

## Basix Core v0.1

The first version focuses on the foundation:

- Monorepo structure
- Admin authentication foundation
- Tenants
- Apps
- API tokens
- Scopes
- API events
- Usage metrics
- Audit logs
- Dashboard overview
- Security-first architecture

## Recommended stack

- Node.js
- TypeScript
- pnpm workspaces
- Turborepo
- NestJS for the API
- Next.js for the admin dashboard
- PostgreSQL
- Prisma
- Redis
- Docker Compose

## Monorepo structure

```txt
apps/
  api/      # NestJS API
  admin/    # Next.js admin dashboard

packages/
  database/ # Prisma schema and database client
  config/   # Shared environment and configuration validation
  auth/     # Shared auth/token helpers
  sdk/      # TypeScript SDK for SaaS integrations
  types/    # Shared contracts and types
  ui/       # Shared UI components

docs/
  ARCHITECTURE.md
  ROADMAP.md
  SECURITY.md

infra/
  docker/
```

## Core principle

Basix Core should start as a modular monolith and only evolve into services when there is a real operational reason to do so.

## Security principle

Security is not an afterthought in this project. Every module must enforce tenant isolation, least privilege, secure token handling, auditability, and safe defaults.
