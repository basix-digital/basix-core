import asyncpg


PLAN_LIMITS: dict[str, int | None] = {
    "starter": 10_000,
    "pro": 100_000,
    "enterprise": None,
    "internal": None,
}


async def enforce_tenant_billing(conn: asyncpg.Connection, tenant_id: str) -> None:
    tenant = await conn.fetchrow(
        'SELECT id, status, plan FROM "Tenant" WHERE id = $1',
        tenant_id,
    )
    if not tenant or tenant["status"] != "active":
        raise PermissionError("tenant is not active")

    limit = PLAN_LIMITS.get((tenant["plan"] or "starter").lower(), PLAN_LIMITS["starter"])
    if limit is None:
        return

    current = await conn.fetchval(
        """
        SELECT COUNT(*)
        FROM ai_message_queue
        WHERE tenant_id = $1
          AND created_at >= date_trunc('month', NOW())
          AND created_at < date_trunc('month', NOW()) + INTERVAL '1 month'
        """,
        tenant_id,
    )
    if int(current or 0) >= limit:
        raise PermissionError("tenant monthly AI message quota exceeded")
