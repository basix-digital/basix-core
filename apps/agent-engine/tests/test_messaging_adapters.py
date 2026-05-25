import os

import pytest

os.environ.setdefault("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/basix_core")

from app import messaging_adapters
from app.messaging_adapters import SentDmWhatsAppAdapter, WhatsAppMessage


class FakeResponse:
    status_code = 202

    def json(self):
        return {
            "success": True,
            "data": {
                "recipients": [
                    {
                        "message_id": "msg_123",
                        "to": "+5511999999999",
                        "channel": "whatsapp",
                    }
                ]
            },
        }


class FakeAsyncClient:
    last_request = None

    def __init__(self, *, timeout):
        self.timeout = timeout

    async def __aenter__(self):
        return self

    async def __aexit__(self, *_args):
        return False

    async def post(self, url, *, headers, json):
        self.__class__.last_request = {
            "url": url,
            "headers": headers,
            "json": json,
            "timeout": self.timeout,
        }
        return FakeResponse()


@pytest.mark.asyncio
async def test_sent_dm_whatsapp_adapter_sends_template_message(monkeypatch):
    monkeypatch.setattr(messaging_adapters.httpx, "AsyncClient", FakeAsyncClient)
    monkeypatch.setattr(
        messaging_adapters.settings,
        "sent_dm_base_url",
        "https://api.sent.dm/v3",
    )

    message_id = await SentDmWhatsAppAdapter({"api_key": "sent-key"}).send(
        WhatsAppMessage(
            from_number="whatsapp:+5511888888888",
            to_number="+5511999999999",
            body="Oi Maria",
            content_sid="tmpl_123",
            content_variables={"firstName": "Maria", "orderNumber": "#123"},
        )
    )

    assert message_id == "msg_123"
    assert FakeAsyncClient.last_request == {
        "url": "https://api.sent.dm/v3/messages",
        "headers": {
            "x-api-key": "sent-key",
            "content-type": "application/json",
        },
        "json": {
            "to": ["+5511999999999"],
            "template": {
                "id": "tmpl_123",
                "parameters": {
                    "firstName": "Maria",
                    "orderNumber": "#123",
                },
            },
            "channel": ["whatsapp"],
        },
        "timeout": 20,
    }
