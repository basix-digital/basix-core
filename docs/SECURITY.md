# Security Principles

Basix Core is security-first.

## Mandatory principles

## 1. Tenant isolation

Every sensitive query must be scoped by tenantId.

Never allow object access by ID only.

## 2. API token safety

- Never store plaintext tokens
- Show token only once during creation
- Store only hashed values
- Support expiration and revocation
- Track lastUsedAt

## 3. Least privilege

Every token must operate with explicit scopes.

Examples:
- tenant:read
- tenant:write
- metrics:write
- events:write

## 4. Auditability

Administrative actions must generate immutable audit logs.

## 5. Safe logging

Never log:
- passwords
- raw tokens
- Authorization headers
- sensitive payloads

## 6. Authentication

- Argon2id for passwords
- Short-lived access tokens
- Rotating refresh tokens
- Brute-force protection
- MFA prepared for future versions

## 7. API protections

- Rate limiting
- Security headers
- Input validation
- Secure CORS policy
- Safe error handling

## References

- OWASP ASVS
- OWASP API Security Top 10
- NIST 800-63B
