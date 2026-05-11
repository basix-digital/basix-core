CREATE TABLE IF NOT EXISTS "ai_message_templates" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "channel_type" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'brevo',
    "provider_template_id" TEXT,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "variables" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_by" TEXT NOT NULL,
    "updated_by" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "ai_message_templates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ai_message_templates_channel_type_check" CHECK ("channel_type" IN ('whatsapp', 'email')),
    CONSTRAINT "ai_message_templates_status_check" CHECK ("status" IN ('active', 'archived'))
);

CREATE TABLE IF NOT EXISTS "ai_campaigns" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "tenant_id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "channel_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "audience_filter" JSONB,
    "scheduled_at" TIMESTAMPTZ,
    "sent_at" TIMESTAMPTZ,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "ai_campaigns_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ai_campaigns_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "ai_message_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ai_campaigns_channel_type_check" CHECK ("channel_type" IN ('whatsapp', 'email')),
    CONSTRAINT "ai_campaigns_status_check" CHECK ("status" IN ('draft', 'queued', 'sent', 'failed', 'canceled'))
);

CREATE TABLE IF NOT EXISTS "ai_campaign_recipients" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "tenant_id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "contact_id" TEXT,
    "channel_id" TEXT,
    "manual_message_id" TEXT,
    "phone_number" TEXT,
    "email" TEXT,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "provider_variables" JSONB,
    "provider_message_id" TEXT,
    "rendered_subject" TEXT,
    "rendered_body" TEXT NOT NULL,
    "error" TEXT,
    "queued_at" TIMESTAMPTZ DEFAULT NOW(),
    "sent_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "ai_campaign_recipients_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ai_campaign_recipients_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "ai_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ai_campaign_recipients_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "crm_contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ai_campaign_recipients_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "ai_channels"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ai_campaign_recipients_manual_message_id_fkey" FOREIGN KEY ("manual_message_id") REFERENCES "ai_manual_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ai_campaign_recipients_status_check" CHECK ("status" IN ('queued', 'processing', 'sent', 'skipped', 'failed'))
);

CREATE UNIQUE INDEX IF NOT EXISTS "ai_message_templates_tenant_id_name_key" ON "ai_message_templates"("tenant_id", "name");
CREATE INDEX IF NOT EXISTS "ai_message_templates_tenant_id_channel_type_status_idx" ON "ai_message_templates"("tenant_id", "channel_type", "status");
CREATE INDEX IF NOT EXISTS "ai_campaigns_tenant_id_status_created_at_idx" ON "ai_campaigns"("tenant_id", "status", "created_at");
CREATE INDEX IF NOT EXISTS "ai_campaigns_tenant_id_channel_type_created_at_idx" ON "ai_campaigns"("tenant_id", "channel_type", "created_at");
CREATE INDEX IF NOT EXISTS "ai_campaign_recipients_tenant_id_campaign_id_status_idx" ON "ai_campaign_recipients"("tenant_id", "campaign_id", "status");
CREATE INDEX IF NOT EXISTS "ai_campaign_recipients_tenant_id_contact_id_created_at_idx" ON "ai_campaign_recipients"("tenant_id", "contact_id", "created_at");
CREATE INDEX IF NOT EXISTS "ai_campaign_recipients_manual_message_id_idx" ON "ai_campaign_recipients"("manual_message_id");
CREATE INDEX IF NOT EXISTS "ai_campaign_recipients_status_email_created_at_idx" ON "ai_campaign_recipients"("status", "email", "created_at");
CREATE INDEX IF NOT EXISTS "ai_campaign_recipients_provider_message_id_idx" ON "ai_campaign_recipients"("provider_message_id");
