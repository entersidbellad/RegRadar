"""
Text chunking module using LangChain RecursiveCharacterTextSplitter.
Splits regulation text into overlapping chunks with metadata for vector indexing.
"""

from langchain_text_splitters import RecursiveCharacterTextSplitter


# Configure the text splitter per spec
_splitter = RecursiveCharacterTextSplitter(
    chunk_size=800,
    chunk_overlap=150,
    separators=["\n\n", "\n", ". ", " "],
    length_function=len,
)


def chunk_document(
    doc_id: str,
    text: str,
    agency: str = "",
    pub_date: str = "",
    cfr_sections: str = "",
) -> list[dict]:
    """
    Split a document into chunks with metadata.

    Args:
        doc_id: The regulation document ID.
        text: The full document text to chunk.
        agency: The issuing agency (e.g., "EPA").
        pub_date: Publication date (ISO format).
        cfr_sections: Comma-separated CFR section references.

    Returns:
        A list of dicts, each with:
          - id: Unique chunk ID (doc_id__chunk_index)
          - text: The chunk text content
          - metadata: Dict with doc_id, agency, pub_date, cfr_sections, chunk_index
    """
    if not text or not text.strip():
        return []

    chunks = _splitter.split_text(text)

    result = []
    for i, chunk_text in enumerate(chunks):
        result.append({
            "id": f"{doc_id}__chunk_{i}",
            "text": chunk_text,
            "metadata": {
                "doc_id": doc_id,
                "agency": agency,
                "pub_date": pub_date,
                "cfr_sections": cfr_sections,
                "chunk_index": i,
            },
        })

    return result
