import asyncio
import json
import structlog

from .agent import run_agent
from .crm import create_activity
from .db import connection, open_pool
from .messaging_adapters import BrevoEmailAdapter, EmailMessage
from .phone import build_user_id
from .provider_credentials import resolve_provider_credentials
from .queue import (
    claim_next,
    claim_next_email_recipient,
    claim_next_manual_message,
    mark_done,
    mark_email_failed,
    mark_email_sent,
    mark_failed,
    mark_manual_failed,
    mark_manual_sent,
)
from .settings import settings
from .twilio_client import TwilioClient

logger = structlog.get_logger()

TWILIO_KEYS = ["account_sid", "auth_token", "api_key_sid", "api_key_secret"]
BREVO_KEYS = ["api_key", "sender_email", "sender_name"]


async def process_once() -> bool:
    async with connection() as conn:
        message = await claim_next(conn, settings.worker_lease_seconds)
        if not message:
            return await process_manual_once(conn) or await process_email_once(conn)

        try:
            conversation = await conn.fetchrow(
                "SELECT mode FROM ai_conversations WHERE id = $1",
                message["conversation_id"],
            )
            if conversation and conversation["mode"] != "ai":
                await mark_done(conn, message["id"], "")
                return True

            response = await run_agent(
                conn,
                {
                    "tenant_id": message["tenant_id"],
                    "agent_id": message["agent_id"],
                    "thread_id": message["thread_id"],
                    "user_id": build_user_id(message["tenant_id"], message["phone_number"]),
                    "message": message["normalized_input"] or message["incoming_message"],
                    "response": "",
                },
            )
            channel = await conn.fetchrow(
                "SELECT phone_number FROM ai_channels WHERE id = $1 AND tenant_id = $2",
                message["channel_id"],
                message["tenant_id"],
            )
            if not channel:
                raise RuntimeError("channel not found for queued message")

            twilio_credentials = await resolve_provider_credentials(
                conn,
                tenant_id=message["tenant_id"],
                provider="twilio",
                keys=TWILIO_KEYS,
                scope_id=message["channel_id"],
                required=False,
            )
            sid = await TwilioClient(twilio_credentials).send_message(
                from_number=channel["phone_number"],
                to_number=message["phone_number"],
                body=response,
            )
            await mark_done(conn, message["id"], response)
            await create_activity(
                conn,
                tenant_id=message["tenant_id"],
                contact_id=message["crm_contact_id"],
                channel_id=message["channel_id"],
                type="message_sent",
                direction="outbound",
                title="AI response sent",
                body=response,
                metadata=json.dumps({"twilioSid": sid, "messageQueueId": message["id"]}),
            )
            await conn.execute(
                """
                INSERT INTO "UsageMetric" (id, "tenantId", "metricName", "metricValue", source, metadata)
                VALUES (gen_random_uuid()::text, $1, 'ai_messages_processed', 1, 'ai_agent_platform', $2::jsonb)
                """,
                message["tenant_id"],
                json.dumps({"messageQueueId": message["id"], "agentId": message["agent_id"]}),
            )
            return True
        except Exception as exc:
            logger.exception("message_processing_failed", message_id=message["id"], error=str(exc))
            await mark_failed(conn, message["id"], str(exc))
            return True


async def process_manual_once(conn) -> bool:
    manual = await claim_next_manual_message(conn, settings.worker_lease_seconds)
    if not manual:
        return False
    try:
        channel = await conn.fetchrow(
            "SELECT phone_number FROM ai_channels WHERE id = $1 AND tenant_id = $2",
            manual["channel_id"],
            manual["tenant_id"],
        )
        if not channel:
            raise RuntimeError("channel not found for manual message")
        twilio_credentials = await resolve_provider_credentials(
            conn,
            tenant_id=manual["tenant_id"],
            provider="twilio",
            keys=TWILIO_KEYS,
            scope_id=manual["channel_id"],
            required=False,
        )
        if manual["provider_template_id"]:
            provider_variables = as_dict(manual["provider_variables"])
            sid = await TwilioClient(twilio_credentials).send_template_message(
                from_number=channel["phone_number"],
                to_number=manual["phone_number"],
                body=manual["body"],
                content_sid=manual["provider_template_id"],
                content_variables=provider_variables,
            )
        else:
            sid = await TwilioClient(twilio_credentials).send_message(
                from_number=channel["phone_number"],
                to_number=manual["phone_number"],
                body=manual["body"],
            )
        await mark_manual_sent(conn, manual["id"], sid)
        await create_activity(
            conn,
            tenant_id=manual["tenant_id"],
            contact_id=manual["crm_contact_id"],
            channel_id=manual["channel_id"],
            type="manual_message_delivered",
            direction="outbound",
            title="Manual WhatsApp message delivered",
            body=manual["body"],
            metadata=json.dumps({"twilioSid": sid, "manualMessageId": manual["id"]}),
        )
        return True
    except Exception as exc:
        logger.exception("manual_message_delivery_failed", manual_message_id=manual["id"], error=str(exc))
        await mark_manual_failed(conn, manual["id"], str(exc))
        return True


async def process_email_once(conn) -> bool:
    recipient = await claim_next_email_recipient(conn, settings.worker_lease_seconds)
    if not recipient:
        return False

    try:
        params = as_dict(recipient["provider_variables"])
        brevo_credentials = await resolve_provider_credentials(
            conn,
            tenant_id=recipient["tenant_id"],
            provider="brevo",
            keys=BREVO_KEYS,
            required=False,
        )
        message_id = await BrevoEmailAdapter(brevo_credentials).send(
            EmailMessage(
                to_email=recipient["email"],
                to_name=recipient["contact_name"],
                subject=recipient["rendered_subject"],
                html_content=recipient["rendered_body"],
                template_id=recipient["provider_template_id"],
                params=params,
            )
        )
        await mark_email_sent(conn, recipient["id"], message_id)
        await create_activity(
            conn,
            tenant_id=recipient["tenant_id"],
            contact_id=recipient["contact_id"],
            channel_id=None,
            type="email_campaign_delivered",
            direction="outbound",
            title="Brevo email delivered",
            body=recipient["rendered_body"],
            metadata=json.dumps(
                {
                    "brevoMessageId": message_id,
                    "campaignId": recipient["campaign_id"],
                    "recipientId": recipient["id"],
                }
            ),
        )
        return True
    except Exception as exc:
        logger.exception("email_delivery_failed", recipient_id=recipient["id"], error=str(exc))
        await mark_email_failed(conn, recipient["id"], str(exc))
        return True


def as_dict(value) -> dict[str, str]:
    if not value:
        return {}
    if isinstance(value, str):
        decoded = json.loads(value)
    else:
        decoded = value
    return {str(key): "" if item is None else str(item) for key, item in dict(decoded).items()}


async def main() -> None:
    await open_pool()
    while True:
        did_work = await process_once()
        if not did_work:
            await asyncio.sleep(settings.worker_poll_seconds)


if __name__ == "__main__":
    asyncio.run(main())
