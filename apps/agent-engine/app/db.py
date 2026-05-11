from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import asyncpg

from .settings import settings


_pool: asyncpg.Pool | None = None


async def open_pool() -> asyncpg.Pool:
    global _pool
    if _pool is None:
        _pool = await asyncpg.create_pool(settings.database_url, min_size=1, max_size=10)
    return _pool


async def close_pool() -> None:
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None


@asynccontextmanager
async def connection() -> AsyncIterator[asyncpg.Connection]:
    pool = await open_pool()
    async with pool.acquire() as conn:
        yield conn
