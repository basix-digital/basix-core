# Basix Agent Engine

FastAPI + LangGraph runtime for the Basix Core AI Agent Platform.

Responsibilities:

- Receive Twilio WhatsApp webhooks.
- Resolve tenant exclusively from the `To` channel phone number.
- Create/update CRM contacts and activities.
- Enqueue messages into `ai_message_queue`.
- Run async workers that execute tenant-scoped LangGraph agents.
- Send WhatsApp responses through Twilio.
- Send WhatsApp template notifications/campaigns through Twilio ContentSid or
  Sent.dm templates.
- Send email notifications/campaigns through Brevo.
- Run LLM calls through provider adapters, with OpenRouter as the default.

The engine does not implement auth, tenant membership, API token issuance,
billing, or admin sessions. Those remain in Basix Core.

## Provider credentials

Production provider credentials are resolved from `provider_credentials` in the
control-plane database and decrypted from the separate Vault database through
`VAULT_DATABASE_URL`. Channel-scoped credentials override tenant defaults, so a
tenant can run dedicated Twilio channels while sharing default Brevo/OpenRouter
credentials.

Set `PROVIDER_CREDENTIALS_FALLBACK_ENV=true` only for local development to read
provider secrets from `.env` when no Vault credential exists. Production should
leave it disabled.

Fallback `.env` keys supported for local development:

- `OPENROUTER_API_KEY`: default LLM provider key.
- `AI_AGENT_LLM_PROVIDER`: defaults to `openrouter`; `openai` is also supported.
- `AI_AGENT_DEFAULT_MODEL`: defaults to `openai/gpt-4.1-mini`.
- `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME`: Brevo email delivery.
- `TWILIO_ACCOUNT_SID` plus either `TWILIO_AUTH_TOKEN` or API key credentials.
- `SENT_DM_API_KEY`, `SENT_DM_BASE_URL`: Sent.dm WhatsApp template delivery.

WhatsApp campaign templates can use Twilio Content Template Builder IDs or
Sent.dm template IDs stored as `providerTemplateId` on `AiMessageTemplate`.
Template variables are mapped into Twilio `ContentVariables` positions for
Twilio and named Sent.dm `parameters` for Sent.dm.
