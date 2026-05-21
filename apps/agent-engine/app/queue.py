import asyncpg

from .phone import build_thread_id, normalize_e164


async def upsert_conversation(
    conn: asyncpg.Connection,
    *,
    tenant_id: str,
    channel_id: str,
    crm_contact_id: str,
    phone: str,
    agent_id: str,
    incoming_message: str,
) -> asyncpg.Record:
    phone_number = normalize_e164(phone)
    thread_id = build_thread_id(tenant_id, channel_id, phone_number)
    return await conn.fetchrow(
        """
        INSERT INTO ai_conversations (
            tenant_id, channel_id, crm_contact_id, phone_number, agent_id,
            thread_id, last_message, last_message_at, message_count
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), 1)
        ON CONFLICT (tenant_id, channel_id, phone_number)
        DO UPDATE SET
            crm_contact_id = EXCLUDED.crm_contact_id,
            agent_id = EXCLUDED.agent_id,
            thread_id = EXCLUDED.thread_id,
            last_message = EXCLUDED.last_message,
            last_message_at = NOW(),
            message_count = ai_conversations.message_count + 1,
            updated_at = NOW()
        RETURNING *
        """,
        tenant_id,
        channel_id,
        crm_contact_id,
        phone_number,
        agent_id,
        thread_id,
        incoming_message,
    )


async def enqueue_message(
    conn: asyncpg.Connection,
    *,
    tenant_id: str,
    channel_id: str,
    conversation_id: str,
    crm_contact_id: str,
    message_id: str | None,
    from_phone: str,
    to_number: str,
    agent_id: str,
    body: str,
    media_url: str | None,
    media_type: str | None,
) -> asyncpg.Record:
    phone_number = normalize_e164(from_phone)
    thread_id = build_thread_id(tenant_id, channel_id, phone_number)
    return await conn.fetchrow(
        """
        INSERT INTO ai_message_queue (
            tenant_id, channel_id, conversation_id, crm_contact_id, message_id,
            phone_number, to_number, agent_id, thread_id, incoming_message,
            media_url, media_type
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (tenant_id, message_id)
        DO UPDATE SET updated_at = NOW()
        RETURNING *
        """,
        tenant_id,
        channel_id,
        conversation_id,
        crm_contact_id,
        message_id,
        phone_number,
        to_number,
        agent_id,
        thread_id,
        body,
        media_url,
        media_type,
    )


async def claim_next(conn: asyncpg.Connection, lease_seconds: int) -> asyncpg.Record | None:
    async with conn.transaction():
        row = await conn.fetchrow(
            """
            SELECT *
            FROM ai_message_queue
            WHERE (
                status = 'queued'
                AND process_after <= NOW()
              )
              OR (
                status = 'processing'
                AND lease_until IS NOT NULL
                AND lease_until <= NOW()
              )
            ORDER BY created_at ASC
            FOR UPDATE SKIP LOCKED
            LIMIT 1
            """
        )
        if not row:
            return None
        return await conn.fetchrow(
            """
            UPDATE ai_message_queue
            SET status = 'processing',
                attempts = attempts + 1,
                lease_until = NOW() + ($2::int * INTERVAL '1 second'),
                updated_at = NOW()
            WHERE id = $1
            RETURNING *
            """,
            row["id"],
            lease_seconds,
        )


async def mark_done(conn: asyncpg.Connection, message_id: str, response: str) -> None:
    await conn.execute(
        """
        UPDATE ai_message_queue
        SET status = 'done',
            response = $2,
            processed_at = NOW(),
            updated_at = NOW()
        WHERE id = $1
        """,
        message_id,
        response,
    )


async def mark_failed(conn: asyncpg.Connection, message_id: str, error: str) -> None:
    row = await conn.fetchrow(
        "SELECT attempts, max_attempts FROM ai_message_queue WHERE id = $1",
        message_id,
    )
    if row and row["attempts"] < row["max_attempts"]:
        await conn.execute(
            """
            UPDATE ai_message_queue
            SET status = 'queued',
                error = $2,
                process_after = NOW() + (attempts * INTERVAL '5 seconds'),
                lease_until = NULL,
                updated_at = NOW()
            WHERE id = $1
            """,
            message_id,
            error,
        )
    else:
        await conn.execute(
            """
            UPDATE ai_message_queue
            SET status = 'failed',
                error = $2,
                processed_at = NOW(),
                updated_at = NOW()
            WHERE id = $1
            """,
            message_id,
            error,
        )



async def claim_next_manual_message(
    conn: asyncpg.Connection,
    lease_seconds: int,
) -> asyncpg.Record | None:
    async with conn.transaction():
        row = await conn.fetchrow(
            """
            SELECT m.*
            FROM ai_manual_messages m
            LEFT JOIN ai_campaign_recipients r ON r.manual_message_id = m.id
            LEFT JOIN ai_campaigns c ON c.id = r.campaign_id
            WHERE (
                m.delivery_status = 'queued'
                OR (
                    m.delivery_status = 'processing'
                    AND m.lease_until IS NOT NULL
                    AND m.lease_until <= NOW()
                )
              )
              AND (c.id IS NULL OR c.scheduled_at IS NULL OR c.scheduled_at <= NOW())
            ORDER BY m.created_at ASC
            FOR UPDATE OF m SKIP LOCKED
            LIMIT 1
            """
        )
        if not row:
            return None
        return await conn.fetchrow(
            """
            UPDATE ai_manual_messages
            SET delivery_status = 'processing',
                attempts = attempts + 1,
                lease_until = NOW() + ($2::int * INTERVAL '1 second')
            WHERE id = $1
            RETURNING *
            """,
            row["id"],
            lease_seconds,
        )


async def mark_manual_sent(conn: asyncpg.Connection, manual_message_id: str, provider_sid: str) -> None:
    async with conn.transaction():
        await conn.execute(
            """
            UPDATE ai_manual_messages
            SET delivery_status = 'sent',
                provider_message_id = $2,
                sent_at = NOW(),
                lease_until = NULL
            WHERE id = $1
            """,
            manual_message_id,
            provider_sid,
        )
        campaign_id = await conn.fetchval(
            """
            UPDATE ai_campaign_recipients
            SET status = 'sent',
                sent_at = NOW(),
                updated_at = NOW()
            WHERE manual_message_id = $1
            RETURNING campaign_id
            """,
            manual_message_id,
        )
        if campaign_id:
            await refresh_campaign_status(conn, campaign_id)


async def mark_manual_failed(conn: asyncpg.Connection, manual_message_id: str, error: str) -> None:
    row = await conn.fetchrow(
        "SELECT attempts, max_attempts FROM ai_manual_messages WHERE id = $1",
        manual_message_id,
    )
    if row and row["attempts"] < row["max_attempts"]:
        async with conn.transaction():
            await conn.execute(
                """
                UPDATE ai_manual_messages
                SET delivery_status = 'queued',
                    delivery_error = $2,
                    lease_until = NULL
                WHERE id = $1
                """,
                manual_message_id,
                error,
            )
            await conn.execute(
                """
                UPDATE ai_campaign_recipients
                SET error = $2,
                    updated_at = NOW()
                WHERE manual_message_id = $1
                """,
                manual_message_id,
                error,
            )
    else:
        async with conn.transaction():
            await conn.execute(
                """
                UPDATE ai_manual_messages
                SET delivery_status = 'failed',
                    delivery_error = $2,
                    lease_until = NULL
                WHERE id = $1
                """,
                manual_message_id,
                error,
            )
            campaign_id = await conn.fetchval(
                """
                UPDATE ai_campaign_recipients
                SET status = 'failed',
                    error = $2,
                    updated_at = NOW()
                WHERE manual_message_id = $1
                RETURNING campaign_id
                """,
                manual_message_id,
                error,
            )
            if campaign_id:
                await refresh_campaign_status(conn, campaign_id)


async def claim_next_email_recipient(
    conn: asyncpg.Connection,
    lease_seconds: int,
) -> dict | None:
    async with conn.transaction():
        row = await conn.fetchrow(
            """
            SELECT r.*,
                   c.name AS campaign_name,
                   c.scheduled_at,
                   t.provider,
                   t.provider_template_id,
                   t.subject,
                   t.body,
                   contact.full_name AS contact_name
            FROM ai_campaign_recipients r
            JOIN ai_campaigns c ON c.id = r.campaign_id
            JOIN ai_message_templates t ON t.id = c.template_id
            LEFT JOIN crm_contacts contact ON contact.id = r.contact_id
            WHERE (
                r.status = 'queued'
                OR (
                    r.status = 'processing'
                    AND r.updated_at <= NOW() - ($1::int * INTERVAL '1 second')
                )
              )
              AND r.email IS NOT NULL
              AND r.manual_message_id IS NULL
              AND c.channel_type = 'email'
              AND t.provider = 'brevo'
              AND (c.scheduled_at IS NULL OR c.scheduled_at <= NOW())
            ORDER BY r.created_at ASC
            FOR UPDATE OF r SKIP LOCKED
            LIMIT 1
            """,
            lease_seconds,
        )
        if not row:
            return None
        updated = await conn.fetchrow(
            """
            UPDATE ai_campaign_recipients
            SET status = 'processing',
                updated_at = NOW()
            WHERE id = $1
            RETURNING *
            """,
            row["id"],
        )
        return {**dict(row), **dict(updated)}


async def mark_email_sent(
    conn: asyncpg.Connection,
    recipient_id: str,
    provider_message_id: str,
) -> None:
    async with conn.transaction():
        campaign_id = await conn.fetchval(
            """
            UPDATE ai_campaign_recipients
            SET status = 'sent',
                provider_message_id = $2,
                sent_at = NOW(),
                updated_at = NOW()
            WHERE id = $1
            RETURNING campaign_id
            """,
            recipient_id,
            provider_message_id,
        )
        if campaign_id:
            await refresh_campaign_status(conn, campaign_id)


async def mark_email_failed(conn: asyncpg.Connection, recipient_id: str, error: str) -> None:
    async with conn.transaction():
        campaign_id = await conn.fetchval(
            """
            UPDATE ai_campaign_recipients
            SET status = 'failed',
                error = $2,
                updated_at = NOW()
            WHERE id = $1
            RETURNING campaign_id
            """,
            recipient_id,
            error,
        )
        if campaign_id:
            await refresh_campaign_status(conn, campaign_id)


async def refresh_campaign_status(conn: asyncpg.Connection, campaign_id: str) -> None:
    pending_count = await conn.fetchval(
        """
        SELECT COUNT(*)
        FROM ai_campaign_recipients
        WHERE campaign_id = $1
          AND status IN ('queued', 'processing')
        """,
        campaign_id,
    )
    if pending_count:
        return

    failed_count = await conn.fetchval(
        """
        SELECT COUNT(*)
        FROM ai_campaign_recipients
        WHERE campaign_id = $1
          AND status = 'failed'
        """,
        campaign_id,
    )
    await conn.execute(
        """
        UPDATE ai_campaigns
        SET status = $2,
            sent_at = CASE WHEN $2 = 'sent' THEN NOW() ELSE sent_at END,
            updated_at = NOW()
        WHERE id = $1
        """,
        campaign_id,
        "failed" if failed_count else "sent",
    )
