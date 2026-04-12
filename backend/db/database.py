"""
SQLite database module using aiosqlite.
Provides async database initialization, connection management, and helper functions.
Uses connection pooling for better performance.
"""

import os
import aiosqlite
from contextlib import asynccontextmanager
from dotenv import load_dotenv

load_dotenv()

SQLITE_DB_PATH = os.getenv("SQLITE_DB_PATH", "./regradar.db")

# Module-level connection pool (created on first use)
_pool: aiosqlite.Connection | None = None


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


async def init_db():
    """Initialize the database by creating all tables if they don't exist."""
    async with get_db() as db:
        await db.executescript(SCHEMA_SQL)
        await db.commit()


async def fetch_one(query: str, params: tuple = ()) -> dict | None:
    """Execute a query and return a single row as a dict, or None.
    Uses connection pooling for better performance."""
    async with get_db() as db:
        cursor = await db.execute(query, params)
        row = await cursor.fetchone()
        if row is None:
            return None
        return dict(row)


async def fetch_all(query: str, params: tuple = ()) -> list[dict]:
    """Execute a query and return all rows as a list of dicts.
    Uses connection pooling for better performance."""
    async with get_db() as db:
        cursor = await db.execute(query, params)
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]


async def execute(query: str, params: tuple = ()) -> int:
    """Execute an INSERT/UPDATE/DELETE and return the number of affected rows.
    Uses connection pooling for better performance."""
    async with get_db() as db:
        cursor = await db.execute(query, params)
        await db.commit()
        return cursor.rowcount


async def execute_many(query: str, params_list: list[tuple]) -> None:
    """Execute a query with multiple parameter sets.
    Uses connection pooling for better performance."""
    async with get_db() as db:
        await db.executemany(query, params_list)
        await db.commit()
