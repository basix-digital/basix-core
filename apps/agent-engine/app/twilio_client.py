from .messaging_adapters import TwilioWhatsAppAdapter, WhatsAppMessage


class TwilioClient:
    def __init__(self, credentials: dict[str, str]) -> None:
        self.adapter = TwilioWhatsAppAdapter(credentials)

    async def send_message(self, *, from_number: str, to_number: str, body: str) -> str:
        return await self.adapter.send(
            WhatsAppMessage(
                from_number=from_number,
                to_number=to_number,
                body=body,
            )
        )

    async def send_template_message(
        self,
        *,
        from_number: str,
        to_number: str,
        body: str,
        content_sid: str,
        content_variables: dict[str, str],
    ) -> str:
        return await self.adapter.send(
            WhatsAppMessage(
                from_number=from_number,
                to_number=to_number,
                body=body,
                content_sid=content_sid,
                content_variables=content_variables,
            )
        )
