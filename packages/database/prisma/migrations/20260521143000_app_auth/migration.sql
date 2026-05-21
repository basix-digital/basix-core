CREATE TABLE IF NOT EXISTS "app_users" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "tenant_id" TEXT NOT NULL,
    "app_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "password_hash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "email_verified_at" TIMESTAMPTZ,
    "scopes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "last_login_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "app_users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "app_users_app_id_fkey" FOREIGN KEY ("app_id") REFERENCES "App"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "app_users_status_check" CHECK ("status" IN ('pending', 'active', 'disabled'))
);

CREATE UNIQUE INDEX IF NOT EXISTS "app_users_tenant_id_app_id_email_key"
ON "app_users"("tenant_id", "app_id", "email");

CREATE INDEX IF NOT EXISTS "app_users_tenant_id_app_id_status_idx"
ON "app_users"("tenant_id", "app_id", "status");

CREATE INDEX IF NOT EXISTS "app_users_tenant_id_app_id_updated_at_idx"
ON "app_users"("tenant_id", "app_id", "updated_at");

CREATE TABLE IF NOT EXISTS "app_user_refresh_sessions" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "app_user_id" TEXT NOT NULL,
    "token_id" TEXT UNIQUE,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "revoked_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "rotated_at" TIMESTAMPTZ,
    CONSTRAINT "app_user_refresh_sessions_app_user_id_fkey" FOREIGN KEY ("app_user_id") REFERENCES "app_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "app_user_refresh_sessions_app_user_id_idx"
ON "app_user_refresh_sessions"("app_user_id");

CREATE INDEX IF NOT EXISTS "app_user_refresh_sessions_expires_at_idx"
ON "app_user_refresh_sessions"("expires_at");

CREATE INDEX IF NOT EXISTS "app_user_refresh_sessions_token_id_expires_at_idx"
ON "app_user_refresh_sessions"("token_id", "expires_at");

CREATE TABLE IF NOT EXISTS "app_auth_tokens" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "tenant_id" TEXT NOT NULL,
    "app_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "token_id" TEXT NOT NULL UNIQUE,
    "token_hash" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "scopes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "expires_at" TIMESTAMPTZ NOT NULL,
    "consumed_at" TIMESTAMPTZ,
    "revoked_at" TIMESTAMPTZ,
    "created_by_user_id" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "app_auth_tokens_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "app_auth_tokens_app_id_fkey" FOREIGN KEY ("app_id") REFERENCES "App"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "app_auth_tokens_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "app_auth_tokens_type_check" CHECK ("type" IN ('email_verification', 'password_reset', 'invite'))
);

CREATE INDEX IF NOT EXISTS "app_auth_tokens_tenant_id_app_id_type_email_idx"
ON "app_auth_tokens"("tenant_id", "app_id", "type", "email");

CREATE INDEX IF NOT EXISTS "app_auth_tokens_tenant_id_app_id_type_expires_at_idx"
ON "app_auth_tokens"("tenant_id", "app_id", "type", "expires_at");

CREATE INDEX IF NOT EXISTS "app_auth_tokens_created_by_user_id_idx"
ON "app_auth_tokens"("created_by_user_id");
