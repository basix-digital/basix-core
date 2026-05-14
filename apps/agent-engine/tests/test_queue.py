import os

import pytest

os.environ.setdefault(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/basix_core",
)

from app.queue import claim_next_manual_message


class FakeTransaction:
    async def __aenter__(self):
        return self

    async def __aexit__(self, *_args):
        return False


class FakeConnection:
    def __init__(self):
        self.fetchrow_calls = []

    def transaction(self):
        return FakeTransaction()

    async def fetchrow(self, query, *args):
        self.fetchrow_calls.append((query, args))
        return None


@pytest.mark.asyncio
async def test_manual_messages_respect_campaign_schedule_before_claiming():
    conn = FakeConnection()

    result = await claim_next_manual_message(conn, lease_seconds=30)

    assert result is None
    query = conn.fetchrow_calls[0][0]
    assert "LEFT JOIN ai_campaign_recipients r ON r.manual_message_id = m.id" in query
    assert "LEFT JOIN ai_campaigns c ON c.id = r.campaign_id" in query
    assert "c.scheduled_at IS NULL OR c.scheduled_at <= NOW()" in query
    assert "FOR UPDATE OF m SKIP LOCKED" in query
