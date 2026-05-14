import os

import pytest

os.environ.setdefault("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/basix_core")

from app import provider_credentials


class FakeConnection:
    def __init__(self, rows):
        self.rows = rows

    async def fetch(self, *_args):
        return self.rows


@pytest.fixture(autouse=True)
def clear_cache():
    provider_credentials._cache.clear()
    yield
    provider_credentials._cache.clear()


@pytest.mark.asyncio
async def test_channel_credentials_override_tenant_defaults(monkeypatch):
    async def fake_read_vault_secret(vault_secret_id):
        return {
            "tenant-secret-id": "tenant-secret",
            "channel-secret-id": "channel-secret",
        }[vault_secret_id]

    monkeypatch.setattr(provider_credentials, "read_vault_secret", fake_read_vault_secret)
    monkeypatch.setattr(
        provider_credentials.settings,
        "provider_credentials_fallback_env",
        False,
    )

    conn = FakeConnection(
        [
            {
                "key": "api_key",
                "vault_secret_id": "channel-secret-id",
                "scope_type": "channel",
                "scope_id": "channel-1",
            },
            {
                "key": "api_key",
                "vault_secret_id": "tenant-secret-id",
                "scope_type": "tenant",
                "scope_id": None,
            },
        ]
    )

    result = await provider_credentials.resolve_provider_credentials(
        conn,
        tenant_id="tenant-1",
        provider="openrouter",
        keys=["api_key"],
        scope_id="channel-1",
    )

    assert result == {"api_key": "channel-secret"}


@pytest.mark.asyncio
async def test_env_fallback_requires_explicit_flag(monkeypatch):
    monkeypatch.setattr(
        provider_credentials,
        "read_env_fallback",
        lambda provider, key: "env-secret",
    )

    conn = FakeConnection([])

    monkeypatch.setattr(
        provider_credentials.settings,
        "provider_credentials_fallback_env",
        False,
    )
    without_fallback = await provider_credentials.resolve_provider_credentials(
        conn,
        tenant_id="tenant-1",
        provider="brevo",
        keys=["api_key"],
        required=False,
    )

    monkeypatch.setattr(
        provider_credentials.settings,
        "provider_credentials_fallback_env",
        True,
    )
    with_fallback = await provider_credentials.resolve_provider_credentials(
        conn,
        tenant_id="tenant-1",
        provider="brevo",
        keys=["api_key"],
        required=False,
    )

    assert without_fallback == {}
    assert with_fallback == {"api_key": "env-secret"}
