"""
RegRadar Backend - FastAPI Application
Environmental compliance monitoring for NC hog farm CAFOs.

Entrypoint for the FastAPI application with:
  - CORS middleware (allow all origins)
  - SQLite + ChromaDB initialization on startup
  - All API route modules mounted under /api
"""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from db.database import init_db
from core.indexing import get_collection_count
from api.routes_regulations import router as regulations_router
from api.routes_businesses import router as businesses_router
from api.routes_analyze import router as analyze_router
from api.routes_alerts import router as alerts_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan handler.
    Initializes SQLite database tables and verifies ChromaDB on startup.
    """
    # Startup
    print("Initializing RegRadar backend...")

    # Initialize SQLite schema
    await init_db()
    print("  SQLite database initialized")

    # Verify ChromaDB connection
    try:
        count = get_collection_count()
        print(f"  ChromaDB connected ({count} chunks in collection)")
    except Exception as e:
        print(f"  ChromaDB warning: {e}")

    print("RegRadar backend ready!")

    yield

    # Shutdown
    print("RegRadar backend shutting down...")


# Create the FastAPI application
app = FastAPI(
    title="RegRadar API",
    description="AI-powered environmental compliance monitoring for NC hog farm CAFOs",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS middleware - allow all origins per spec
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount route modules
app.include_router(regulations_router)
app.include_router(businesses_router)
app.include_router(analyze_router)
app.include_router(alerts_router)


@app.get("/api/health")
async def health_check():
    """
    Health check endpoint.
    Returns the status of all backend services.
    """
    # Check SQLite
    sqlite_ok = False
    try:
        from db.database import fetch_one
        result = await fetch_one("SELECT 1 as ok")
        sqlite_ok = result is not None
    except Exception:
        pass

    # Check ChromaDB
    chromadb_ok = False
    chromadb_count = 0
    try:
        chromadb_count = get_collection_count()
        chromadb_ok = True
    except Exception:
        pass

    # Check Gemini configuration
    gemini_configured = bool(os.getenv("GEMINI_API_KEY"))

    return {
        "status": "ok" if (sqlite_ok and chromadb_ok) else "degraded",
        "sqlite": "connected" if sqlite_ok else "disconnected",
        "chromadb": {
            "status": "connected" if chromadb_ok else "disconnected",
            "chunks": chromadb_count,
        },
        "gemini_configured": gemini_configured,
    }
