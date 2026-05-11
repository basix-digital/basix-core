import json
from dataclasses import dataclass

import httpx

from .settings import settings


@dataclass(frozen=True)
class EmailMessage:
    to_email: str
    to_name: str | None
    subject: str | None
    html_content: str
    template_id: str | None
    params: dict[str, str]


@dataclass(frozen=True)
class WhatsAppMessage:
    from_number: str
    to_number: str
    body: str
    content_sid: str | None = None
    content_variables: dict[str, str] | None = None


class BrevoEmailAdapter:
    def __init__(self, credentials: dict[str, str]) -> None:
        self.credentials = credentials

    async def send(self, message: EmailMessage) -> str:
        api_key = self.credentials.get("api_key", "")
        sender_email = self.credentials.get("sender_email", "")
        sender_name = self.credentials.get("sender_name") or settings.brevo_sender_name

        if not api_key:
            raise RuntimeError("BREVO_API_KEY is required for email delivery")
        if not sender_email:
            raise RuntimeError("BREVO_SENDER_EMAIL is required for email delivery")

        payload: dict[str, object] = {
            "sender": {
                "name": sender_name,
                "email": sender_email,
            },
            "to": [
                {
                    "email": message.to_email,
                    **({"name": message.to_name} if message.to_name else {}),
                }
            ],
            "params": message.params,
        }

        if message.template_id:
            payload["templateId"] = int(message.template_id)
        else:
            if not message.subject:
                raise RuntimeError("subject is required when sending Brevo email without templateId")
            payload["subject"] = message.subject
            payload["htmlContent"] = message.html_content

        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.post(
                f"{settings.brevo_base_url.rstrip('/')}/smtp/email",
                headers={
                    "accept": "application/json",
                    "api-key": api_key,
                    "content-type": "application/json",
                },
                json=payload,
            )
            response.raise_for_status()
            data = response.json()
            return str(data.get("messageId", ""))


class TwilioWhatsAppAdapter:
    def __init__(self, credentials: dict[str, str]) -> None:
        self.credentials = credentials

    async def send(self, message: WhatsAppMessage) -> str:
        account_sid = self.credentials.get("account_sid", "")
        auth_token = self.credentials.get("auth_token", "")
        api_key_sid = self.credentials.get("api_key_sid", "")
        api_key_secret = self.credentials.get("api_key_secret", "")

        if not account_sid:
            raise RuntimeError("TWILIO_ACCOUNT_SID is required")
        auth_user = api_key_sid or account_sid
        auth_password = api_key_secret or auth_token
        if not auth_user or not auth_password:
            raise RuntimeError("Twilio credentials are required")

        data = {
            "From": message.from_number,
            "To": f"whatsapp:{message.to_number}",
        }
        if message.content_sid:
            data["ContentSid"] = message.content_sid
            if message.content_variables:
                data["ContentVariables"] = json.dumps(message.content_variables)
        else:
            data["Body"] = message.body

        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.post(
                "https://api.twilio.com/2010-04-01/Accounts/"
                f"{account_sid}/Messages.json",
                data=data,
                auth=(auth_user, auth_password),
            )
            response.raise_for_status()
            payload = response.json()
            return str(payload.get("sid", ""))
