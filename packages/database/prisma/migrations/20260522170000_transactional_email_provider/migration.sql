ALTER TABLE "Tenant"
ADD COLUMN IF NOT EXISTS "transactional_email_provider" TEXT NOT NULL DEFAULT 'resend';

ALTER TABLE "Tenant"
DROP CONSTRAINT IF EXISTS "Tenant_transactional_email_provider_check";

ALTER TABLE "Tenant"
ADD CONSTRAINT "Tenant_transactional_email_provider_check"
CHECK ("transactional_email_provider" IN ('resend', 'brevo'));

ALTER TABLE "provider_credentials"
DROP CONSTRAINT IF EXISTS "provider_credentials_provider_check";

ALTER TABLE "provider_credentials"
ADD CONSTRAINT "provider_credentials_provider_check"
CHECK ("provider" IN ('openrouter', 'resend', 'brevo', 'twilio'));
