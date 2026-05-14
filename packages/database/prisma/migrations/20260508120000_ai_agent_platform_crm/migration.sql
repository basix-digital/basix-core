CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS "ai_channels" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "tenant_id" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL UNIQUE,
    "agent_id_default" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'twilio',
    "status" TEXT NOT NULL DEFAULT 'active',
    "encrypted_secrets" JSONB,
    "rate_limit_per_minute" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "ai_channels_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "crm_pipelines" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "tenant_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "crm_pipelines_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "crm_stages" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "tenant_id" TEXT NOT NULL,
    "pipeline_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "probability" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "crm_stages_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "crm_stages_pipeline_id_fkey" FOREIGN KEY ("pipeline_id") REFERENCES "crm_pipelines"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "crm_contacts" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "tenant_id" TEXT NOT NULL,
    "full_name" TEXT,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "source" TEXT NOT NULL DEFAULT 'whatsapp',
    "status" TEXT NOT NULL DEFAULT 'new',
    "lead_score" INTEGER NOT NULL DEFAULT 0,
    "assigned_to" TEXT,
    "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "pipeline_id" TEXT,
    "stage_id" TEXT,
    "last_contact_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "crm_contacts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "crm_contacts_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "crm_contacts_pipeline_id_fkey" FOREIGN KEY ("pipeline_id") REFERENCES "crm_pipelines"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "crm_contacts_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "crm_stages"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "ai_conversations" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "tenant_id" TEXT NOT NULL,
    "channel_id" TEXT NOT NULL,
    "crm_contact_id" TEXT,
    "phone_number" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "thread_id" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'ai',
    "last_message" TEXT NOT NULL DEFAULT '',
    "last_message_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "message_count" INTEGER NOT NULL DEFAULT 0,
    "taken_over_by_user_id" TEXT,
    "taken_over_at" TIMESTAMPTZ,
    "released_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "ai_conversations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ai_conversations_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "ai_channels"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ai_conversations_crm_contact_id_fkey" FOREIGN KEY ("crm_contact_id") REFERENCES "crm_contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ai_conversations_mode_check" CHECK ("mode" IN ('ai', 'human', 'paused', 'closed'))
);

CREATE TABLE IF NOT EXISTS "ai_message_queue" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "tenant_id" TEXT NOT NULL,
    "channel_id" TEXT NOT NULL,
    "conversation_id" TEXT,
    "crm_contact_id" TEXT,
    "message_id" TEXT,
    "phone_number" TEXT NOT NULL,
    "to_number" TEXT,
    "agent_id" TEXT NOT NULL,
    "thread_id" TEXT NOT NULL,
    "incoming_message" TEXT NOT NULL,
    "media_url" TEXT,
    "media_type" TEXT,
    "normalized_input" TEXT,
    "media_processing_status" TEXT NOT NULL DEFAULT 'none',
    "media_processing_error" TEXT,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "process_after" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 3,
    "lease_until" TIMESTAMPTZ,
    "response" TEXT,
    "error" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "processed_at" TIMESTAMPTZ,
    CONSTRAINT "ai_message_queue_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ai_message_queue_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "ai_channels"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ai_message_queue_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "ai_conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ai_message_queue_crm_contact_id_fkey" FOREIGN KEY ("crm_contact_id") REFERENCES "crm_contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ai_message_queue_status_check" CHECK ("status" IN ('queued', 'processing', 'done', 'failed'))
);

CREATE TABLE IF NOT EXISTS "ai_manual_messages" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "tenant_id" TEXT NOT NULL,
    "channel_id" TEXT NOT NULL,
    "conversation_id" TEXT,
    "crm_contact_id" TEXT,
    "phone_number" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "sender_user_id" TEXT,
    "body" TEXT NOT NULL,
    "provider_template_id" TEXT,
    "provider_variables" JSONB,
    "provider_message_id" TEXT,
    "delivery_status" TEXT NOT NULL DEFAULT 'queued',
    "delivery_error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 3,
    "lease_until" TIMESTAMPTZ,
    "sent_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "ai_manual_messages_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ai_manual_messages_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "ai_channels"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ai_manual_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "ai_conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ai_manual_messages_crm_contact_id_fkey" FOREIGN KEY ("crm_contact_id") REFERENCES "crm_contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "ai_message_media" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "tenant_id" TEXT NOT NULL,
    "channel_id" TEXT NOT NULL,
    "conversation_id" TEXT,
    "message_queue_id" TEXT,
    "manual_message_id" TEXT,
    "phone_number" TEXT NOT NULL,
    "bucket_key" TEXT NOT NULL UNIQUE,
    "mime_type" TEXT NOT NULL,
    "size_bytes" BIGINT NOT NULL DEFAULT 0,
    "direction" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "ai_message_media_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ai_message_media_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "ai_channels"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ai_message_media_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "ai_conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ai_message_media_message_queue_id_fkey" FOREIGN KEY ("message_queue_id") REFERENCES "ai_message_queue"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ai_message_media_manual_message_id_fkey" FOREIGN KEY ("manual_message_id") REFERENCES "ai_manual_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ai_message_media_owner_check" CHECK (("message_queue_id" IS NOT NULL AND "manual_message_id" IS NULL) OR ("message_queue_id" IS NULL AND "manual_message_id" IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS "ai_lead_contexts" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "tenant_id" TEXT NOT NULL,
    "channel_id" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "external_id" TEXT,
    "name" TEXT,
    "email" TEXT,
    "company" TEXT,
    "score" INTEGER NOT NULL DEFAULT 0,
    "profile" TEXT NOT NULL DEFAULT 'unknown',
    "main_leak" TEXT,
    "answers_json" JSONB NOT NULL DEFAULT '[]'::JSONB,
    "source" TEXT NOT NULL DEFAULT 'whatsapp',
    "received_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "ai_lead_contexts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ai_lead_contexts_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "ai_channels"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "ai_agent_llm_settings" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "tenant_id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'openrouter',
    "model" TEXT,
    "system_prompt" TEXT NOT NULL,
    "temperature" DOUBLE PRECISION,
    "top_p" DOUBLE PRECISION,
    "top_k" INTEGER,
    "created_by" TEXT,
    "updated_by" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "ai_agent_llm_settings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "ai_playbooks" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "tenant_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "current_version_id" TEXT,
    "is_global_template" BOOLEAN NOT NULL DEFAULT FALSE,
    "created_by" TEXT NOT NULL,
    "reviewed_by" TEXT,
    "approved_at" TIMESTAMPTZ,
    "performance_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "ai_playbooks_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "ai_playbook_versions" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "tenant_id" TEXT NOT NULL,
    "playbook_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "parent_version" INTEGER,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "trigger_phrases" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "situation" TEXT NOT NULL,
    "response_strategy" TEXT NOT NULL,
    "example_response" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "next_step" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 5,
    "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "min_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "created_by" TEXT NOT NULL,
    "reviewed_by" TEXT,
    "approved_at" TIMESTAMPTZ,
    "performance_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "positive_examples" JSONB NOT NULL DEFAULT '[]'::JSONB,
    "negative_examples" JSONB NOT NULL DEFAULT '[]'::JSONB,
    "search_text" TEXT NOT NULL DEFAULT '',
    "embedding" VECTOR(1536),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "ai_playbook_versions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ai_playbook_versions_playbook_id_fkey" FOREIGN KEY ("playbook_id") REFERENCES "ai_playbooks"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "ai_agent_playbook_assignments" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "tenant_id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "playbook_id" TEXT NOT NULL,
    "playbook_version_id" TEXT NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT TRUE,
    "is_active" BOOLEAN NOT NULL DEFAULT FALSE,
    "priority_override" INTEGER,
    "min_score_override" DOUBLE PRECISION,
    "activated_by" TEXT,
    "activated_at" TIMESTAMPTZ,
    "disabled_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "ai_agent_playbook_assignments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ai_agent_playbook_assignments_playbook_id_fkey" FOREIGN KEY ("playbook_id") REFERENCES "ai_playbooks"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ai_agent_playbook_assignments_playbook_version_id_fkey" FOREIGN KEY ("playbook_version_id") REFERENCES "ai_playbook_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "ai_playbook_usage_events" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "tenant_id" TEXT NOT NULL,
    "playbook_id" TEXT,
    "playbook_version_id" TEXT,
    "agent_id" TEXT NOT NULL,
    "message_queue_id" TEXT,
    "phone_number" TEXT NOT NULL,
    "lead_message" TEXT NOT NULL,
    "classification" JSONB NOT NULL DEFAULT '{}'::JSONB,
    "retrieved_examples" JSONB NOT NULL DEFAULT '[]'::JSONB,
    "response_text" TEXT,
    "stage" TEXT,
    "outcome" TEXT,
    "converted" BOOLEAN,
    "manual_rating" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "ai_playbook_usage_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ai_playbook_usage_events_playbook_id_fkey" FOREIGN KEY ("playbook_id") REFERENCES "ai_playbooks"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ai_playbook_usage_events_playbook_version_id_fkey" FOREIGN KEY ("playbook_version_id") REFERENCES "ai_playbook_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ai_playbook_usage_events_message_queue_id_fkey" FOREIGN KEY ("message_queue_id") REFERENCES "ai_message_queue"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "crm_activities" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "tenant_id" TEXT NOT NULL,
    "contact_id" TEXT,
    "pipeline_id" TEXT,
    "stage_id" TEXT,
    "channel_id" TEXT,
    "actor_user_id" TEXT,
    "type" TEXT NOT NULL,
    "direction" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "metadata" JSONB,
    "occurred_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "crm_activities_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "crm_activities_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "crm_contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "crm_activities_pipeline_id_fkey" FOREIGN KEY ("pipeline_id") REFERENCES "crm_pipelines"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "crm_activities_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "crm_stages"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "crm_activities_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "ai_channels"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "crm_pipelines_tenant_id_key_key" ON "crm_pipelines"("tenant_id", "key");
CREATE UNIQUE INDEX IF NOT EXISTS "crm_stages_tenant_id_pipeline_id_key_key" ON "crm_stages"("tenant_id", "pipeline_id", "key");
CREATE UNIQUE INDEX IF NOT EXISTS "crm_contacts_tenant_id_phone_key" ON "crm_contacts"("tenant_id", "phone");
CREATE UNIQUE INDEX IF NOT EXISTS "ai_conversations_tenant_id_channel_id_phone_number_key" ON "ai_conversations"("tenant_id", "channel_id", "phone_number");
CREATE UNIQUE INDEX IF NOT EXISTS "ai_message_queue_tenant_id_message_id_key" ON "ai_message_queue"("tenant_id", "message_id");
CREATE UNIQUE INDEX IF NOT EXISTS "ai_lead_contexts_tenant_id_channel_id_phone_number_agent_id_key" ON "ai_lead_contexts"("tenant_id", "channel_id", "phone_number", "agent_id");
CREATE UNIQUE INDEX IF NOT EXISTS "ai_agent_llm_settings_tenant_id_agent_id_key" ON "ai_agent_llm_settings"("tenant_id", "agent_id");
CREATE UNIQUE INDEX IF NOT EXISTS "ai_playbook_versions_tenant_id_playbook_id_version_key" ON "ai_playbook_versions"("tenant_id", "playbook_id", "version");
CREATE UNIQUE INDEX IF NOT EXISTS "ai_agent_playbook_assignments_tenant_id_agent_id_playbook_id_playbook_version_id_key" ON "ai_agent_playbook_assignments"("tenant_id", "agent_id", "playbook_id", "playbook_version_id");

CREATE INDEX IF NOT EXISTS "ai_channels_tenant_id_idx" ON "ai_channels"("tenant_id");
CREATE INDEX IF NOT EXISTS "ai_channels_tenant_id_status_idx" ON "ai_channels"("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "crm_contacts_tenant_id_status_idx" ON "crm_contacts"("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "crm_contacts_tenant_id_assigned_to_idx" ON "crm_contacts"("tenant_id", "assigned_to");
CREATE INDEX IF NOT EXISTS "crm_contacts_tenant_id_last_contact_at_idx" ON "crm_contacts"("tenant_id", "last_contact_at");
CREATE INDEX IF NOT EXISTS "crm_activities_tenant_id_contact_id_occurred_at_idx" ON "crm_activities"("tenant_id", "contact_id", "occurred_at");
CREATE INDEX IF NOT EXISTS "crm_activities_tenant_id_type_occurred_at_idx" ON "crm_activities"("tenant_id", "type", "occurred_at");
CREATE INDEX IF NOT EXISTS "ai_conversations_tenant_id_last_message_at_idx" ON "ai_conversations"("tenant_id", "last_message_at");
CREATE INDEX IF NOT EXISTS "ai_conversations_tenant_id_mode_idx" ON "ai_conversations"("tenant_id", "mode");
CREATE INDEX IF NOT EXISTS "ai_message_queue_tenant_id_status_process_after_created_at_idx" ON "ai_message_queue"("tenant_id", "status", "process_after", "created_at");
CREATE INDEX IF NOT EXISTS "ai_message_queue_tenant_id_phone_number_channel_id_idx" ON "ai_message_queue"("tenant_id", "phone_number", "channel_id");
CREATE INDEX IF NOT EXISTS "ai_manual_messages_tenant_id_phone_number_channel_id_created_at_idx" ON "ai_manual_messages"("tenant_id", "phone_number", "channel_id", "created_at");
CREATE INDEX IF NOT EXISTS "ai_manual_messages_delivery_status_created_at_idx" ON "ai_manual_messages"("delivery_status", "created_at");
CREATE INDEX IF NOT EXISTS "ai_playbooks_tenant_id_status_type_category_idx" ON "ai_playbooks"("tenant_id", "status", "type", "category");
CREATE INDEX IF NOT EXISTS "ai_playbook_versions_tenant_id_playbook_id_status_version_idx" ON "ai_playbook_versions"("tenant_id", "playbook_id", "status", "version");
CREATE INDEX IF NOT EXISTS "ai_agent_playbook_assignments_tenant_id_agent_id_is_enabled_is_active_idx" ON "ai_agent_playbook_assignments"("tenant_id", "agent_id", "is_enabled", "is_active");
CREATE INDEX IF NOT EXISTS "ai_playbook_usage_events_tenant_id_agent_id_created_at_idx" ON "ai_playbook_usage_events"("tenant_id", "agent_id", "created_at");
