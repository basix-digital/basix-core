import json

from fastapi import FastAPI, HTTPException, Request, Response
from twilio.request_validator import RequestValidator

from .billing import enforce_tenant_billing
from .crm import create_activity, upsert_contact_for_message
from .db import close_pool, connection, open_pool
from .phone import normalize_e164
from .provider_credentials import resolve_provider_credentials
from .queue import enqueue_message, upsert_conversation
from .tenant import resolve_channel_by_to
from .vault_client import close_vault_pool

app = FastAPI(title="Basix Agent Engine")


@app.on_event("startup")
async def startup() -> None:
    await open_pool()


@app.on_event("shutdown")
async def shutdown() -> None:
    await close_pool()
    await close_vault_pool()


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/webhook/twilio")
async def twilio_webhook(request: Request) -> Response:
    form = await request.form()
    payload = {key: str(value) for key, value in form.items()}

    from_phone = normalize_e164(payload.get("From", ""))
    to_number = payload.get("To", "")
    body = payload.get("Body", "").strip()
    message_sid = payload.get("MessageSid")
    num_media = int(payload.get("NumMedia") or "0")
    media_url = payload.get("MediaUrl0") if num_media > 0 else None
    media_type = payload.get("MediaContentType0") if num_media > 0 else None

    async with connection() as conn:
        try:
            channel = await resolve_channel_by_to(conn, to_number)
        except LookupError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc
        except PermissionError as exc:
            raise HTTPException(status_code=403, detail=str(exc)) from exc

        await validate_twilio_signature(request, payload, conn, channel.tenant_id, channel.channel_id)

        try:
            await enforce_tenant_billing(conn, channel.tenant_id)
        except PermissionError as exc:
            raise HTTPException(status_code=402, detail=str(exc)) from exc

        async with conn.transaction():
            contact = await upsert_contact_for_message(
                conn,
                tenant_id=channel.tenant_id,
                phone=from_phone,
            )
            conversation = await upsert_conversation(
                conn,
                tenant_id=channel.tenant_id,
                channel_id=channel.channel_id,
                crm_contact_id=contact["id"],
                phone=from_phone,
                agent_id=channel.agent_id_default,
                incoming_message=body,
            )
            await enqueue_message(
                conn,
                tenant_id=channel.tenant_id,
                channel_id=channel.channel_id,
                conversation_id=conversation["id"],
                crm_contact_id=contact["id"],
                message_id=message_sid,
                from_phone=from_phone,
                to_number=to_number,
                agent_id=channel.agent_id_default,
                body=body,
                media_url=media_url,
                media_type=media_type,
            )
            await create_activity(
                conn,
                tenant_id=channel.tenant_id,
                contact_id=contact["id"],
                channel_id=channel.channel_id,
                type="message_received",
                direction="inbound",
                title="WhatsApp message received",
                body=body,
                metadata=json.dumps({"messageSid": message_sid, "numMedia": num_media}),
            )

    return Response("<Response></Response>", media_type="application/xml")


async def validate_twilio_signature(
    request: Request,
    payload: dict[str, str],
    conn,
    tenant_id: str,
    channel_id: str,
) -> None:
    credentials = await resolve_provider_credentials(
        conn,
        tenant_id=tenant_id,
        provider="twilio",
        keys=["auth_token"],
        scope_id=channel_id,
        required=False,
    )
    auth_token = credentials.get("auth_token")
    if not auth_token:
        raise HTTPException(status_code=403, detail="missing Twilio signature credential")

    signature = request.headers.get("X-Twilio-Signature")
    if not signature:
        raise HTTPException(status_code=403, detail="missing Twilio signature")
    validator = RequestValidator(auth_token)
    url = str(request.url)
    if not validator.validate(url, payload, signature):
        raise HTTPException(status_code=403, detail="invalid Twilio signature")
