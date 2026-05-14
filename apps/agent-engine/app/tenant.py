import asyncpg
from pydantic import BaseModel

from .phone import normalize_whatsapp


class ChannelContext(BaseModel):
    tenant_id: str
    channel_id: str
    agent_id_default: str
    phone_number: str


async def resolve_channel_by_to(conn: asyncpg.Connection, to_number: str) -> ChannelContext:
    phone_number = normalize_whatsapp(to_number)
    row = await conn.fetchrow(
        """
        SELECT id, tenant_id, agent_id_default, phone_number
        FROM ai_channels
        WHERE phone_number = $1
          AND status = 'active'
        """,
        phone_number,
    )
    if not row:
        raise LookupError("active channel not found for Twilio To number")

    tenant = await conn.fetchrow(
        "SELECT id, status FROM \"Tenant\" WHERE id = $1",
        row["tenant_id"],
    )
    if not tenant or tenant["status"] != "active":
        raise PermissionError("tenant is not active")

    return ChannelContext(
        tenant_id=row["tenant_id"],
        channel_id=row["id"],
        agent_id_default=row["agent_id_default"],
        phone_number=row["phone_number"],
    )
