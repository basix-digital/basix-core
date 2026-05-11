import re


E164 = re.compile(r"^\+\d{8,15}$")


def normalize_e164(value: str) -> str:
    phone = value.strip()
    if phone.startswith("whatsapp:"):
        phone = phone.removeprefix("whatsapp:")
    if not E164.match(phone):
        raise ValueError("phone must be E.164")
    return phone


def normalize_whatsapp(value: str) -> str:
    return f"whatsapp:{normalize_e164(value)}"


def build_thread_id(tenant_id: str, channel_id: str, phone: str) -> str:
    return f"tenant:{tenant_id}:channel:{channel_id}:lead:{normalize_e164(phone)}"


def build_user_id(tenant_id: str, phone: str) -> str:
    return f"tenant:{tenant_id}:lead:{normalize_e164(phone)}"


def build_memory_namespace(tenant_id: str, phone: str) -> str:
    return f"{build_user_id(tenant_id, phone)}:memories"
