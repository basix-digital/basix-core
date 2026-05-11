ALTER TABLE "ai_agent_llm_settings"
ADD COLUMN IF NOT EXISTS "provider" TEXT NOT NULL DEFAULT 'openrouter';

ALTER TABLE "ai_message_templates"
ADD COLUMN IF NOT EXISTS "provider" TEXT NOT NULL DEFAULT 'brevo',
ADD COLUMN IF NOT EXISTS "provider_template_id" TEXT;

UPDATE "ai_message_templates"
SET "provider" = CASE
    WHEN "channel_type" = 'whatsapp' THEN 'twilio'
    ELSE 'brevo'
END
WHERE "provider" = 'brevo' AND "channel_type" = 'whatsapp';

ALTER TABLE "ai_manual_messages"
ADD COLUMN IF NOT EXISTS "provider_template_id" TEXT,
ADD COLUMN IF NOT EXISTS "provider_variables" JSONB;

ALTER TABLE "ai_campaign_recipients"
ADD COLUMN IF NOT EXISTS "provider_variables" JSONB,
ADD COLUMN IF NOT EXISTS "provider_message_id" TEXT;

ALTER TABLE "ai_campaign_recipients"
DROP CONSTRAINT IF EXISTS "ai_campaign_recipients_status_check";

ALTER TABLE "ai_campaign_recipients"
ADD CONSTRAINT "ai_campaign_recipients_status_check"
CHECK ("status" IN ('queued', 'processing', 'sent', 'skipped', 'failed'));

CREATE INDEX IF NOT EXISTS "ai_campaign_recipients_status_email_created_at_idx"
ON "ai_campaign_recipients"("status", "email", "created_at");

CREATE INDEX IF NOT EXISTS "ai_campaign_recipients_provider_message_id_idx"
ON "ai_campaign_recipients"("provider_message_id");
