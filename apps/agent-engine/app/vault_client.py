from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import asyncpg

from .settings import settings


_vault_pool: asyncpg.Pool | None = None


async def open_vault_pool() -> asyncpg.Pool:
    global _vault_pool
    if _vault_pool is None:
        if not settings.vault_database_url:
            raise RuntimeError("VAULT_DATABASE_URL is required for provider credentials")
        _vault_pool = await asyncpg.create_pool(settings.vault_database_url, min_size=1, max_size=5)
    return _vault_pool


async def close_vault_pool() -> None:
    global _vault_pool
    if _vault_pool is not None:
        await _vault_pool.close()
        _vault_pool = None


@asynccontextmanager
async def vault_connection() -> AsyncIterator[asyncpg.Connection]:
    pool = await open_vault_pool()
    async with pool.acquire() as conn:
        yield conn


async def read_vault_secret(vault_secret_id: str) -> str | None:
    async with vault_connection() as conn:
        return await conn.fetchval(
            """
            SELECT decrypted_secret
            FROM vault.decrypted_secrets
            WHERE id = $1::uuid
            """,
            vault_secret_id,
        )
