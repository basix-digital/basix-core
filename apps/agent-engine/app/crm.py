import asyncpg


async def ensure_default_pipeline(conn: asyncpg.Connection, tenant_id: str) -> tuple[str, str]:
    pipeline = await conn.fetchrow(
        """
        INSERT INTO crm_pipelines (tenant_id, key, name, description, sort_order)
        VALUES ($1, 'inbound', 'Inbound', 'Default WhatsApp inbound CRM pipeline', 10)
        ON CONFLICT (tenant_id, key)
        DO UPDATE SET updated_at = NOW()
        RETURNING id
        """,
        tenant_id,
    )
    pipeline_id = pipeline["id"]
    stage = await conn.fetchrow(
        """
        INSERT INTO crm_stages (tenant_id, pipeline_id, key, name, probability, sort_order)
        VALUES ($1, $2, 'new_lead', 'Novo lead', 10, 10)
        ON CONFLICT (tenant_id, pipeline_id, key)
        DO UPDATE SET updated_at = NOW()
        RETURNING id
        """,
        tenant_id,
        pipeline_id,
    )
    for key, name, probability, sort_order in [
        ("qualified", "Qualificado", 35, 20),
        ("proposal_sent", "Proposta enviada", 60, 30),
        ("negotiation", "Negociação", 75, 40),
        ("won", "Fechado", 100, 50),
        ("lost", "Perdido", 0, 60),
    ]:
        await conn.execute(
            """
            INSERT INTO crm_stages (tenant_id, pipeline_id, key, name, probability, sort_order)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (tenant_id, pipeline_id, key) DO NOTHING
            """,
            tenant_id,
            pipeline_id,
            key,
            name,
            probability,
            sort_order,
        )
    return pipeline_id, stage["id"]


async def upsert_contact_for_message(
    conn: asyncpg.Connection,
    tenant_id: str,
    phone: str,
    source: str = "whatsapp",
) -> asyncpg.Record:
    pipeline_id, stage_id = await ensure_default_pipeline(conn, tenant_id)
    return await conn.fetchrow(
        """
        INSERT INTO crm_contacts (
            tenant_id, phone, source, status, pipeline_id, stage_id, last_contact_at
        )
        VALUES ($1, $2, $3, 'new', $4, $5, NOW())
        ON CONFLICT (tenant_id, phone)
        DO UPDATE SET
            last_contact_at = NOW(),
            updated_at = NOW()
        RETURNING *
        """,
        tenant_id,
        phone,
        source,
        pipeline_id,
        stage_id,
    )


async def create_activity(
    conn: asyncpg.Connection,
    *,
    tenant_id: str,
    contact_id: str | None,
    channel_id: str | None,
    type: str,
    title: str,
    body: str | None = None,
    direction: str | None = None,
    metadata: str | None = None,
) -> None:
    await conn.execute(
        """
        INSERT INTO crm_activities (
            tenant_id, contact_id, channel_id, type, title, body, direction, metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8::jsonb, '{}'::jsonb))
        """,
        tenant_id,
        contact_id,
        channel_id,
        type,
        title,
        body,
        direction,
        metadata,
    )
