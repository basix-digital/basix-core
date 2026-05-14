CREATE TABLE IF NOT EXISTS "provider_credentials" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "tenant_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "scope_type" TEXT NOT NULL,
    "scope_id" TEXT,
    "key" TEXT NOT NULL,
    "vault_secret_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "metadata" JSONB,
    "created_by" TEXT,
    "rotated_at" TIMESTAMPTZ,
    "revoked_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "provider_credentials_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "provider_credentials_provider_check" CHECK ("provider" IN ('openrouter', 'brevo', 'twilio')),
    CONSTRAINT "provider_credentials_scope_type_check" CHECK ("scope_type" IN ('tenant', 'channel')),
    CONSTRAINT "provider_credentials_status_check" CHECK ("status" IN ('active', 'revoked'))
);

CREATE INDEX IF NOT EXISTS "provider_credentials_tenant_id_provider_key_status_idx"
ON "provider_credentials"("tenant_id", "provider", "key", "status");

CREATE INDEX IF NOT EXISTS "provider_credentials_tenant_id_provider_scope_type_scope_id_status_idx"
ON "provider_credentials"("tenant_id", "provider", "scope_type", "scope_id", "status");

CREATE UNIQUE INDEX IF NOT EXISTS "provider_credentials_active_tenant_scope_key_unique"
ON "provider_credentials"("tenant_id", "provider", "scope_type", COALESCE("scope_id", ''), "key")
WHERE "status" = 'active';
