CREATE TABLE IF NOT EXISTS "tenant_environment_variables" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "tenant_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "vault_secret_id" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_by" TEXT,
    "rotated_at" TIMESTAMPTZ,
    "revoked_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "tenant_environment_variables_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "tenant_environment_variables_key_check" CHECK ("key" ~ '^[A-Z][A-Z0-9_]{0,127}$'),
    CONSTRAINT "tenant_environment_variables_status_check" CHECK ("status" IN ('active', 'revoked'))
);

CREATE INDEX IF NOT EXISTS "tenant_environment_variables_tenant_id_key_status_idx"
ON "tenant_environment_variables"("tenant_id", "key", "status");

CREATE INDEX IF NOT EXISTS "tenant_environment_variables_tenant_id_status_updated_at_idx"
ON "tenant_environment_variables"("tenant_id", "status", "updated_at");

CREATE UNIQUE INDEX IF NOT EXISTS "tenant_environment_variables_active_tenant_key_unique"
ON "tenant_environment_variables"("tenant_id", "key")
WHERE "status" = 'active';
