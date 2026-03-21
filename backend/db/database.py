"""
SQLite database module using aiosqlite.
Provides async database initialization, connection management, and helper functions.
"""

import os
import aiosqlite
from dotenv import load_dotenv

load_dotenv()

SQLITE_DB_PATH = os.getenv("SQLITE_DB_PATH", "./regradar.db")

# SQL schema for all 4 tables
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
    response_hash TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (business_id) REFERENCES businesses(id),
    FOREIGN KEY (regulation_id) REFERENCES regulations(id)
);

CREATE TABLE IF NOT EXISTS attestations (
    id TEXT PRIMARY KEY,
    analysis_id TEXT NOT NULL,
    tx_signature TEXT NOT NULL,
    explorer_url TEXT NOT NULL,
    sha256_hash TEXT NOT NULL,
    memo_data TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (analysis_id) REFERENCES analyses(id)
);
"""


async def get_db() -> aiosqlite.Connection:
    """Get an async SQLite database connection."""
    db = await aiosqlite.connect(SQLITE_DB_PATH)
    db.row_factory = aiosqlite.Row
    await db.execute("PRAGMA journal_mode=WAL")
    await db.execute("PRAGMA foreign_keys=ON")
    return db


async def init_db():
    """Initialize the database by creating all tables if they don't exist."""
    db = await get_db()
    try:
        await db.executescript(SCHEMA_SQL)
        await db.commit()
    finally:
        await db.close()


async def fetch_one(query: str, params: tuple = ()) -> dict | None:
    """Execute a query and return a single row as a dict, or None."""
    db = await get_db()
    try:
        cursor = await db.execute(query, params)
        row = await cursor.fetchone()
        if row is None:
            return None
        return dict(row)
    finally:
        await db.close()


async def fetch_all(query: str, params: tuple = ()) -> list[dict]:
    """Execute a query and return all rows as a list of dicts."""
    db = await get_db()
    try:
        cursor = await db.execute(query, params)
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]
    finally:
        await db.close()


async def execute(query: str, params: tuple = ()) -> int:
    """Execute an INSERT/UPDATE/DELETE and return the number of affected rows."""
    db = await get_db()
    try:
        cursor = await db.execute(query, params)
        await db.commit()
        return cursor.rowcount
    finally:
        await db.close()


async def execute_many(query: str, params_list: list[tuple]) -> None:
    """Execute a query with multiple parameter sets."""
    db = await get_db()
    try:
        await db.executemany(query, params_list)
        await db.commit()
    finally:
        await db.close()
