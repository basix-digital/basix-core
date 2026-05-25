import time
from collections.abc import Iterable

import asyncpg

from .settings import settings
from .vault_client import read_vault_secret

CacheKey = tuple[str, str, str, str]

_cache: dict[CacheKey, tuple[float, str]] = {}
_cache_ttl_seconds = 60


async def resolve_provider_credentials(
    conn: asyncpg.Connection,
    *,
    tenant_id: str,
    provider: str,
    keys: Iterable[str],
    scope_id: str | None = None,
    required: bool = True,
) -> dict[str, str]:
    requested_keys = list(dict.fromkeys(keys))
    credentials: dict[str, str] = {}
    now = time.monotonic()

    for key in requested_keys:
        cache_key = (tenant_id, provider, scope_id or "tenant", key)
        cached = _cache.get(cache_key)
        if cached and cached[0] > now:
            credentials[key] = cached[1]

    missing_keys = [key for key in requested_keys if key not in credentials]
    if missing_keys:
        rows = await conn.fetch(
            """
            SELECT key, vault_secret_id, scope_type, scope_id
            FROM provider_credentials
            WHERE tenant_id = $1
              AND provider = $2
              AND key = ANY($3::text[])
              AND status = 'active'
              AND (
                (scope_type = 'channel' AND scope_id = $4)
                OR (scope_type = 'tenant' AND scope_id IS NULL)
              )
            ORDER BY CASE
                WHEN scope_type = 'channel' AND scope_id = $4 THEN 0
                ELSE 1
              END
            """,
            tenant_id,
            provider,
            missing_keys,
            scope_id,
        )

        for row in rows:
            key = row["key"]
            if key in credentials:
                continue
            secret = await read_vault_secret(row["vault_secret_id"])
            if secret:
                credentials[key] = secret
                _cache[(tenant_id, provider, scope_id or "tenant", key)] = (
                    now + _cache_ttl_seconds,
                    secret,
                )

    if settings.provider_credentials_fallback_env:
        for key in requested_keys:
            if key not in credentials:
                fallback = read_env_fallback(provider, key)
                if fallback:
                    credentials[key] = fallback

    if required:
        missing = [key for key in requested_keys if key not in credentials]
        if missing:
            raise RuntimeError(
                f"missing provider credentials for {provider}: {', '.join(missing)}"
            )

    return credentials


def read_env_fallback(provider: str, key: str) -> str:
    values = {
        "openrouter": {
            "api_key": settings.openrouter_api_key,
        },
        "openai": {
            "api_key": settings.openai_api_key,
        },
        "brevo": {
            "api_key": settings.brevo_api_key,
            "sender_email": settings.brevo_sender_email,
            "sender_name": settings.brevo_sender_name,
        },
        "twilio": {
            "account_sid": settings.twilio_account_sid,
            "auth_token": settings.twilio_auth_token,
            "api_key_sid": settings.twilio_api_key_sid,
            "api_key_secret": settings.twilio_api_key_secret,
        },
        "sent_dm": {
            "api_key": settings.sent_dm_api_key or settings.sent_api_key,
        },
    }
    return values.get(provider, {}).get(key, "")
