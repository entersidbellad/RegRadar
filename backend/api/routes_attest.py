"""
Attestation and Alerts API routes.
POST /api/attest  - Attest an analysis on Solana devnet via SPL Memo Program
GET  /api/alerts  - Return pre-loaded alert data
"""

import os
import json
import hashlib
import uuid
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from dotenv import load_dotenv

from db.database import fetch_one, execute

load_dotenv()

router = APIRouter(prefix="/api", tags=["attest", "alerts"])

SOLANA_KEYPAIR_PATH = os.getenv("SOLANA_KEYPAIR_PATH", "./devnet-keypair.json")
# SPL Memo Program ID
MEMO_PROGRAM_ID = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"

# Load alerts from seed data at module level
_alerts: list[dict] = []
_alerts_loaded = False


def _load_alerts():
    """Load alerts from the seed data file."""
    global _alerts, _alerts_loaded
    if _alerts_loaded:
        return

    alerts_path = Path(__file__).parent.parent.parent / "data" / "alerts_seed.json"
    if alerts_path.exists():
        with open(alerts_path) as f:
            _alerts = json.load(f)
    _alerts_loaded = True


class AttestRequest(BaseModel):
    """Request body for the attest endpoint."""
    analysis_id: str


@router.post("/attest")
async def attest(request: AttestRequest):
    """
    Attest a compliance analysis on Solana devnet using the SPL Memo Program.

    This endpoint:
    1. Fetches the analysis from SQLite
    2. Computes a SHA256 hash of the analysis
    3. Sends a memo transaction to Solana devnet with the hash
    4. Stores the attestation record in SQLite
    5. Returns the transaction details

    Body:
        analysis_id: The UUID of the analysis to attest
    """
    # 1. Fetch the analysis
    analysis = await fetch_one(
        "SELECT * FROM analyses WHERE id = ?",
        (request.analysis_id,),
    )

    if not analysis:
        raise HTTPException(
            status_code=404,
            detail=f"Analysis not found: {request.analysis_id}",
        )

    # Check if already attested
    existing = await fetch_one(
        "SELECT * FROM attestations WHERE analysis_id = ?",
        (request.analysis_id,),
    )
    if existing:
        return {
            "tx_signature": existing["tx_signature"],
            "explorer_url": existing["explorer_url"],
            "sha256_hash": existing["sha256_hash"],
            "timestamp": existing["created_at"],
        }

    # 2. Use pre-computed response_hash from analyses table; fall back to recomputing
    sha256_hash = analysis.get("response_hash") or hashlib.sha256(
        analysis.get("full_response", "").encode()
    ).hexdigest()

    # 3. Build pipe-delimited memo string: RegRadar|biz|reg|hash|timestamp
    iso_timestamp = datetime.now(timezone.utc).isoformat()
    memo_data = (
        f"RegRadar"
        f"|{analysis['business_id']}"
        f"|{analysis['regulation_id']}"
        f"|{sha256_hash}"
        f"|{iso_timestamp}"
    )

    # 4. Send Solana transaction
    try:
        tx_signature = await _send_solana_memo(memo_data)
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail={
                "error": f"Solana devnet unavailable: {str(e)}",
                "cached_hash": sha256_hash,
            },
        )

    explorer_url = f"https://explorer.solana.com/tx/{tx_signature}?cluster=devnet"

    # 5. Store attestation record
    attestation_id = str(uuid.uuid4())
    created_at = datetime.now(timezone.utc).isoformat()

    await execute(
        """INSERT INTO attestations 
           (id, analysis_id, tx_signature, explorer_url, sha256_hash, memo_data, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (
            attestation_id,
            request.analysis_id,
            tx_signature,
            explorer_url,
            sha256_hash,
            memo_data,
            created_at,
        ),
    )

    return {
        "tx_signature": tx_signature,
        "explorer_url": explorer_url,
        "sha256_hash": sha256_hash,
        "timestamp": created_at,
    }


async def _send_solana_memo(memo_data: str) -> str:
    """
    Send a memo transaction to Solana devnet using the SPL Memo Program.
    Uses a server-side keypair (no wallet adapter).

    Returns:
        Transaction signature string.
    """
    from solders.keypair import Keypair
    from solders.pubkey import Pubkey
    from solders.instruction import Instruction, AccountMeta
    from solders.message import Message
    from solders.transaction import Transaction
    from solders.hash import Hash as SolHash
    from solana.rpc.api import Client as SolanaClient

    # Load keypair
    keypair_path = Path(SOLANA_KEYPAIR_PATH)
    if not keypair_path.exists():
        raise RuntimeError(
            f"Solana keypair not found at {SOLANA_KEYPAIR_PATH}. "
            f"Generate one with: solana-keygen new --outfile {SOLANA_KEYPAIR_PATH} --no-bip39-passphrase"
        )

    with open(keypair_path) as f:
        keypair_data = json.load(f)

    keypair = Keypair.from_bytes(bytes(keypair_data))

    # Connect to devnet
    solana_client = SolanaClient("https://api.devnet.solana.com")

    # Build memo instruction
    memo_program_id = Pubkey.from_string(MEMO_PROGRAM_ID)

    memo_ix = Instruction(
        program_id=memo_program_id,
        accounts=[AccountMeta(pubkey=keypair.pubkey(), is_signer=True, is_writable=True)],
        data=memo_data.encode("utf-8"),
    )

    # Get recent blockhash
    blockhash_resp = solana_client.get_latest_blockhash()
    recent_blockhash = blockhash_resp.value.blockhash

    # Build and sign transaction
    msg = Message.new_with_blockhash(
        [memo_ix],
        keypair.pubkey(),
        recent_blockhash,
    )
    tx = Transaction.new_unsigned(msg)
    tx.sign([keypair], recent_blockhash)

    # Send transaction
    result = solana_client.send_transaction(tx)

    return str(result.value)


@router.get("/alerts")
async def list_alerts(
    since: str | None = Query(None, description="Filter alerts with timestamp >= this ISO date (e.g., 2026-01-01)"),
):
    """
    Return pre-loaded alert data from seed files.
    Optionally filter by timestamp using the 'since' query parameter.
    In production, this would query a real-time monitoring system.
    """
    _load_alerts()
    if since:
        return [a for a in _alerts if a.get("timestamp", "") >= since]
    return _alerts
