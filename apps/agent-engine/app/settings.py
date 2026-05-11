from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = Field(alias="DATABASE_URL")
    vault_database_url: str = Field(default="", alias="VAULT_DATABASE_URL")
    provider_credentials_fallback_env: bool = Field(
        default=False,
        alias="PROVIDER_CREDENTIALS_FALLBACK_ENV",
    )
    default_llm_provider: str = Field(default="openrouter", alias="AI_AGENT_LLM_PROVIDER")
    openrouter_api_key: str = Field(default="", alias="OPENROUTER_API_KEY")
    openrouter_base_url: str = Field(
        default="https://openrouter.ai/api/v1",
        alias="OPENROUTER_BASE_URL",
    )
    openrouter_http_referer: str = Field(default="", alias="OPENROUTER_HTTP_REFERER")
    openrouter_app_title: str = Field(default="Basix Core", alias="OPENROUTER_APP_TITLE")
    openai_api_key: str = Field(default="", alias="OPENAI_API_KEY")
    openai_base_url: str | None = Field(default=None, alias="OPENAI_BASE_URL")
    default_model: str = Field(default="openai/gpt-4.1-mini", alias="AI_AGENT_DEFAULT_MODEL")
    brevo_api_key: str = Field(default="", alias="BREVO_API_KEY")
    brevo_base_url: str = Field(default="https://api.brevo.com/v3", alias="BREVO_BASE_URL")
    brevo_sender_email: str = Field(default="", alias="BREVO_SENDER_EMAIL")
    brevo_sender_name: str = Field(default="Basix Core", alias="BREVO_SENDER_NAME")
    twilio_auth_token: str = Field(default="", alias="TWILIO_AUTH_TOKEN")
    twilio_account_sid: str = Field(default="", alias="TWILIO_ACCOUNT_SID")
    twilio_api_key_sid: str = Field(default="", alias="TWILIO_API_KEY_SID")
    twilio_api_key_secret: str = Field(default="", alias="TWILIO_API_KEY_SECRET")
    worker_poll_seconds: float = Field(default=1.0, alias="AI_WORKER_POLL_SECONDS")
    worker_lease_seconds: int = Field(default=120, alias="AI_WORKER_LEASE_SECONDS")


settings = Settings()
