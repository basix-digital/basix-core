# Basix Core Architecture

Basix Core is a secure modular monorepo designed to provide shared infrastructure for multiple Basix Digital SaaS products.

## Architectural direction

Basix Core uses a hybrid monorepo approach:

- NestJS for the main transactional API
- Next.js for the admin dashboard
- FastAPI/Python for AI agents and agent execution runtime
- PostgreSQL as the main operational database
- Redis for queues, rate limits, cache, and async coordination
- Shared packages for configuration, contracts, SDKs, and database access

## Why this architecture

The platform should remain a modular monolith until scale or operational pressure justifies service extraction.

NestJS is used for the core API because it provides strong structure for modules, guards, validation, dependency injection, RBAC, API tokens, and multi-tenant boundaries.

Python/FastAPI is used for agents because the AI ecosystem, orchestration libraries, and experimentation velocity are stronger in Python.

## Monorepo layout

```txt
apps/
  api/              # NestJS core API
  admin/            # Next.js admin dashboard
  agents-api/       # FastAPI service for AI agents

packages/
  database/         # Prisma schema and client for the NestJS core
  config/           # Shared environment validation and configuration docs
  contracts/        # OpenAPI/JSON Schema/shared API contracts
  sdk/              # TypeScript SDK for SaaS integrations
  types/            # Shared TypeScript types
  ui/               # Shared UI components

python-packages/
  agents-core/      # Shared Python agent tools, prompts, runners, adapters

infra/
  docker/           # Docker-related files

docs/
  ARCHITECTURE.md
  ROADMAP.md
  SECURITY.md
```

## Application responsibilities

## apps/api — NestJS Core API

Responsible for:

- Admin authentication
- Users
- Tenants
- Tenant users
- Apps
- API tokens
- Scope validation
- API events
- Usage metrics
- Audit logs
- Dashboard API
- Future business modules such as scheduling, commerce, coupons, and inventory

The NestJS API is the source of truth for tenant ownership, permissions, token validation, and operational data.

## apps/admin — Next.js Admin

Responsible for:

- Basix Core admin dashboard
- Tenant management
- App management
- API token creation/revocation
- Usage overview
- Audit log visibility
- Future module configuration screens

## apps/agents-api — FastAPI Agents Runtime

Responsible for:

- AI agent execution
- Prompt/template runtime
- LLM provider adapters
- Tool execution
- Agent run status
- AI-specific observability
- Cost/tokens reporting back to the NestJS core

The agents runtime should not own tenant permissions. It must validate requests with the NestJS Core API or receive signed internal service credentials.

## Security boundaries

## Public SaaS integrations

External SaaS apps connect to Basix Core through the NestJS API using API tokens.

```txt
SaaS App -> NestJS Core API
```

## Agent execution

Agent execution should flow through the core API when possible.

```txt
SaaS App -> NestJS Core API -> FastAPI Agents Runtime
```

Direct access to the agents runtime should be private/internal only.

## Tenant isolation

Tenant isolation is enforced by the NestJS API.

Rules:

- Every tenant-owned record must include tenantId
- Every query must filter by tenantId
- API tokens must resolve to tenantId and scopes
- Agent executions must include tenantId and agentId
- Python runtime must never trust tenantId sent directly by an external client

## Database strategy

For v0.1:

- One PostgreSQL database
- Shared public schema
- tenantId column on tenant-owned tables
- Prisma used by NestJS core
- Python services should not write directly to core tables unless explicitly approved

Preferred pattern:

```txt
FastAPI Agents Runtime -> NestJS Core API -> PostgreSQL
```

Allowed exception:

- Python may write to dedicated agent runtime tables only if the schema is clearly isolated and reviewed.

## Communication patterns

## Synchronous

Used for:

- Validating an agent run request
- Starting simple agent execution
- Fetching agent configuration

```txt
NestJS -> FastAPI HTTP internal API
```

## Asynchronous

Used for:

- Long-running agents
- Background jobs
- Retries
- Cost aggregation
- Webhooks

```txt
NestJS -> Redis Queue -> FastAPI Worker
```

This can be introduced after v0.1.

## API token model

External SaaS apps authenticate with API tokens issued by Basix Core.

Rules:

- Token shown only once
- Store only token hash
- Token has prefix
- Token has scopes
- Token can expire
- Token can be revoked
- Every request updates lastUsedAt asynchronously when possible

## Internal service authentication

Service-to-service communication must not use user API tokens.

Use dedicated internal credentials:

- INTERNAL_SERVICE_TOKEN
- HMAC-signed request headers, or
- mTLS in a future production setup

Minimum v0.1 requirement:

```txt
X-Internal-Service: basix-core-api
X-Internal-Signature: hmac_sha256(timestamp + body)
X-Internal-Timestamp: unix timestamp
```

## Observability v0.1

Basix Core should store basic events:

- requestId
- tenantId
- appId
- tokenId
- method
- path
- statusCode
- durationMs
- createdAt

Agents should report:

- agentId
- tenantId
- runId
- status
- model
- tokensIn
- tokensOut
- estimatedCost
- durationMs

## Deployment model

Initial deployment can be a single environment with multiple apps:

```txt
Docker Compose:
- api
- admin
- agents-api
- postgres
- redis
```

Future production deployment may separate workloads:

```txt
- core-api service
- admin app
- agents-api service
- agents-worker service
- postgres
- redis
```

## Non-goals for v0.1

- Microservices
- Multi-database tenancy
- Kubernetes
- Complex event sourcing
- Full AI agent orchestration
- Full commerce module
- Full scheduling module

## v0.1 acceptance architecture

The architecture is acceptable when:

- The monorepo boots locally
- NestJS API has a secure module structure
- FastAPI agents app exists with healthcheck and internal auth placeholder
- PostgreSQL and Redis run locally
- Shared documentation is clear
- API token design is implemented in the core API
- Tenant isolation rules are testable
