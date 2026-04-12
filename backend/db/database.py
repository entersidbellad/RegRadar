"""
SQLite database module using aiosqlite.
Provides async database initialization, connection management, and helper functions.
Uses connection pooling for better performance with automatic retry logic.
"""

import os
import asyncio
import logging
import sqlite3
from functools import wraps
from contextlib import asynccontextmanager
from typing import TypeVar, Callable

import aiosqlite
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

SQLITE_DB_PATH = os.getenv("SQLITE_DB_PATH", "./regradar.db")

# Retry configuration
MAX_RETRIES = 3
RETRY_DELAY_BASE = 0.1  # Base delay in seconds (100ms)
RETRY_EXCEPTIONS = (sqlite3.OperationalError, sqlite3.DatabaseError, aiosqlite.Error)

# Module-level connection pool (created on first use)
_pool: aiosqlite.Connection | None = None


T = TypeVar("T")


def with_retry(max_retries: int = MAX_RETRIES, exceptions: tuple = RETRY_EXCEPTIONS):
    """Decorator that adds exponential backoff retry logic for transient SQLite errors.
    
    Args:
        max_retries: Maximum number of retry attempts
        exceptions: Tuple of exception types to catch and retry
    """
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @wraps(func)
        async def wrapper(*args, **kwargs) -> T:
            last_exception = None
            for attempt in range(max_retries + 1):
                try:
                    return await func(*args, **kwargs)
                except exceptions as e:
                    last_exception = e
                    # Check if it's a retryable error (locked, busy, timeout)
                    error_str = str(e).lower()
                    is_retryable = any(err in error_str for err in ["locked", "busy", "timeout", "database is locked"])
                    
                    if not is_retryable or attempt == max_retries:
                        raise
                    
                    # Exponential backoff: 100ms, 200ms, 400ms
                    delay = RETRY_DELAY_BASE * (2 ** attempt)
                    logger.warning(f"Database operation failed (attempt {attempt + 1}/{max_retries + 1}): {e}. Retrying in {delay:.0f}ms...")
                    await asyncio.sleep(delay)
            
            # Should never reach here, but just in case
            raise last_exception
        return wrapper
    return decorator


async def _get_pool_connection() -> aiosqlite.Connection:
    """Get or create a pooled database connection."""
    global _pool
    if _pool is None:
        _pool = await aiosqlite.connect(SQLITE_DB_PATH)
        _pool.row_factory = aiosqlite.Row
        await _pool.execute("PRAGMA journal_mode=WAL")
        await _pool.execute("PRAGMA foreign_keys=ON")
        # Enable automatic retries for busy/locked scenarios
        await _pool.execute("PRAGMA busy_timeout=5000")  # 5 second timeout
    return _pool

# SQL schema for all 3 tables
SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS businesses (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    permit_number TEXT,
    naics_code TEXT,
    county TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    operation_type TEXT,
    head_count INTEGER,
    permit_type TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS regulations (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    agency TEXT NOT NULL,
    document_type TEXT,
    publication_date TEXT NOT NULL,
    effective_date TEXT,
    abstract TEXT,
    raw_text_url TEXT,
    full_text TEXT,
    cfr_references TEXT,
    ingested_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS analyses (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL,
    regulation_id TEXT NOT NULL,
    overall_status TEXT NOT NULL,
    confidence REAL,
    gaps_json TEXT,
    actions_json TEXT,
    requirements_json TEXT,
    summary TEXT,
    full_response TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (business_id) REFERENCES businesses(id),
    FOREIGN KEY (regulation_id) REFERENCES regulations(id)
);
"""


@asynccontextmanager
async def get_db() -> aiosqlite.Connection:
    """Get an async SQLite database connection from the pool.
    
    Usage:
        async with get_db() as db:
            ...
    """
    db = await _get_pool_connection()
    try:
        yield db
    except Exception:
        # Rollback on error
        await db.rollback()
        raise


@with_retry()
async def init_db():
    """Initialize the database by creating all tables if they don't exist.
    Includes automatic retry for transient SQLite errors."""
    async with get_db() as db:
        await db.executescript(SCHEMA_SQL)
        await db.commit()


@with_retry()
async def fetch_one(query: str, params: tuple = ()) -> dict | None:
    """Execute a query and return a single row as a dict, or None.
    Uses connection pooling and automatic retry for better reliability."""
    async with get_db() as db:
        cursor = await db.execute(query, params)
        row = await cursor.fetchone()
        if row is None:
            return None
        return dict(row)


@with_retry()
async def fetch_all(query: str, params: tuple = ()) -> list[dict]:
    """Execute a query and return all rows as a list of dicts.
    Uses connection pooling and automatic retry for better reliability."""
    async with get_db() as db:
        cursor = await db.execute(query, params)
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]


@with_retry()
async def execute(query: str, params: tuple = ()) -> int:
    """Execute an INSERT/UPDATE/DELETE and return the number of affected rows.
    Uses connection pooling and automatic retry for better reliability."""
    async with get_db() as db:
        cursor = await db.execute(query, params)
        await db.commit()
        return cursor.rowcount


@with_retry()
async def execute_many(query: str, params_list: list[tuple]) -> None:
    """Execute a query with multiple parameter sets.
    Uses connection pooling and automatic retry for better reliability."""
    async with get_db() as db:
        await db.executemany(query, params_list)
        await db.commit()
