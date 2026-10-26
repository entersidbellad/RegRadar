"""
ChromaDB vector indexing module.
Manages embedding and semantic search of regulation text chunks.
Uses sentence-transformers/all-MiniLM-L6-v2 for 384-dimensional embeddings.
"""

import os
import logging
import threading
import chromadb
from chromadb.utils.embedding_functions import SentenceTransformerEmbeddingFunction
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

load_dotenv()

CHROMA_PERSIST_DIR = os.getenv("CHROMA_PERSIST_DIR", "./chroma_data")
COLLECTION_NAME = "regulations"
EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"

# Module-level singleton with thread-safe initialization
_client: chromadb.ClientAPI | None = None
_collection: chromadb.Collection | None = None
# Reentrant: get_collection() holds the lock while calling get_client().
_lock = threading.RLock()


def _get_embedding_function() -> SentenceTransformerEmbeddingFunction:
    """Get the sentence-transformer embedding function."""
    return SentenceTransformerEmbeddingFunction(
        model_name=EMBEDDING_MODEL,
    )


def get_client() -> chromadb.ClientAPI:
    """Get or create the ChromaDB persistent client.
    Thread-safe singleton pattern."""
    global _client
    if _client is None:
        with _lock:
            # Double-check pattern to avoid race conditions
            if _client is None:
                _client = chromadb.PersistentClient(path=CHROMA_PERSIST_DIR)
    return _client


def get_collection() -> chromadb.Collection:
    """Get or create the regulations collection.
    Thread-safe singleton pattern."""
    global _collection
    if _collection is None:
        with _lock:
            # Double-check pattern to avoid race conditions
            if _collection is None:
                client = get_client()
                _collection = client.get_or_create_collection(
                    name=COLLECTION_NAME,
                    embedding_function=_get_embedding_function(),
                    metadata={"hnsw:space": "cosine"},
                )
    return _collection


def index_chunks(chunks: list[dict]) -> int:
    """
    Index a list of document chunks into ChromaDB.

    Args:
        chunks: List of dicts with keys: id, text, metadata.

    Returns:
        Number of chunks indexed.
    """
    if not chunks:
        return 0

    collection = get_collection()

    ids = [chunk["id"] for chunk in chunks]
    documents = [chunk["text"] for chunk in chunks]
    metadatas = [chunk["metadata"] for chunk in chunks]

    # Upsert in batches of 100 to avoid memory issues
    batch_size = 100
    total = 0
    for i in range(0, len(ids), batch_size):
        batch_ids = ids[i : i + batch_size]
        batch_docs = documents[i : i + batch_size]
        batch_meta = metadatas[i : i + batch_size]

        collection.upsert(
            ids=batch_ids,
            documents=batch_docs,
            metadatas=batch_meta,
        )
        total += len(batch_ids)

    return total


def search(
    query: str,
    top_k: int = 10,
    metadata_filters: dict | None = None,
) -> list[dict]:
    """
    Search for relevant regulation chunks using semantic similarity.

    Args:
        query: The text query to search for.
        top_k: Number of results to return.
        metadata_filters: Optional ChromaDB where clause for metadata filtering.
            Example: {"doc_id": "2025-10542"} or {"agency": "EPA"}

    Returns:
        List of dicts with keys: id, text, metadata, distance.
    """
    collection = get_collection()

    query_params = {
        "query_texts": [query],
        "n_results": top_k,
    }

    if metadata_filters:
        # Build a ChromaDB where clause
        if len(metadata_filters) == 1:
            key, value = next(iter(metadata_filters.items()))
            query_params["where"] = {key: value}
        else:
            # Multiple filters use $and
            conditions = [{k: v} for k, v in metadata_filters.items()]
            query_params["where"] = {"$and": conditions}

    results = collection.query(**query_params)

    # Flatten ChromaDB's nested result format
    output = []
    if results and results["ids"] and results["ids"][0]:
        for i in range(len(results["ids"][0])):
            output.append({
                "id": results["ids"][0][i],
                "text": results["documents"][0][i] if results["documents"] else "",
                "metadata": results["metadatas"][0][i] if results["metadatas"] else {},
                "distance": results["distances"][0][i] if results["distances"] else 0.0,
            })

    return output


def delete_by_doc_id(doc_id: str) -> None:
    """Delete all chunks for a given document ID."""
    collection = get_collection()
    # Get all chunk IDs for this document
    results = collection.get(where={"doc_id": doc_id})
    if results and results["ids"]:
        collection.delete(ids=results["ids"])


def get_collection_count() -> int:
    """Return the total number of chunks in the collection."""
    try:
        collection = get_collection()
        return collection.count()
    except Exception as e:
        logger.error(f"Failed to get collection count: {e}")
        return 0
