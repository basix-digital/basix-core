# Basix Core Roadmap

## v0.1 — Foundation Layer

### Milestone 1 — Monorepo Foundation
- Setup pnpm workspaces
- Setup Turborepo
- Create apps/api
- Create apps/admin
- Create packages/database
- Docker Compose with PostgreSQL and Redis
- Environment validation

### Milestone 2 — Admin Authentication
- Admin login
- JWT access token
- Refresh token rotation
- Argon2id password hashing
- Session revocation
- Brute-force protection

### Milestone 3 — Tenants & Apps
- Tenant CRUD
- App CRUD
- Tenant-user relationship
- Role structure

### Milestone 4 — API Tokens
- Secure token generation
- Token hashing
- Scope validation
- Token revocation
- Expiration policies

### Milestone 5 — Events & Observability
- API event registration
- Usage metrics
- Audit logs
- Request tracing

### Milestone 6 — Dashboard
- Tenant overview
- Request overview
- Error visibility
- Recent activity

### Milestone 7 — Security Hardening
- Tenant isolation tests
- Security review
- Secure headers
- Rate limiting
- CORS restrictions
- Production readiness checklist

---

## Future modules

### v0.2
- Scheduling
- Calendar blocks
- Availability rules
- Bookings

### v0.3
- Commerce
- Products
- Orders
- Coupons
- Inventory

### v0.4
- AI Agents
- Agent executions
- Prompt templates
- Cost tracking
- Webhooks
