# Git Flow

Basix Core follows a simplified Git Flow strategy.

## Branches

### main
Production-ready branch.

Rules:
- Always stable
- Receives only release or urgent fix pull requests
- Should require CI checks before merge

### develop
Main integration branch for active development.

Rules:
- Feature branches start from develop
- Feature pull requests target develop
- Must remain runnable locally

### feature branches
Pattern:

```txt
feature/<short-description>
```

Examples:

```txt
feature/monorepo-bootstrap
feature/admin-auth
feature/api-token-guard
```

### fix branches
Pattern:

```txt
fix/<short-description>
```

### chore branches
Pattern:

```txt
chore/<short-description>
```

### release branches
Pattern:

```txt
release/v0.1.0
```

### hotfix branches
Pattern:

```txt
hotfix/<short-description>
```

## Conventional Commits

Examples:

```txt
feat(api): add tenant creation endpoint
fix(auth): prevent session reuse
chore(repo): setup pnpm workspace
docs(security): document access policy
test(tokens): add revoked credential coverage
refactor(database): isolate tenant queries
```

Allowed types:

```txt
feat
fix
docs
chore
refactor
test
perf
build
ci
security
```

## Pull request template expectations

Every PR should include:

- What changed
- Why it changed
- Security considerations
- Test evidence
- Related issue

## Security review rule

Any PR touching auth, credentials, tenancy, permissions, or data access must include explicit security notes.
