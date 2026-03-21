"""
Text extraction module.
Handles extracting clean text from HTML content, URLs, and PDF files.
"""

import re
import httpx
from bs4 import BeautifulSoup


def extract_text_from_html(html_content: str) -> str:
    """
    Extract clean plaintext from HTML content.
    Used for Federal Register full_text fields which are stored as HTML.
    """
    if not html_content:
        return ""

    soup = BeautifulSoup(html_content, "html.parser")

    # Remove script and style elements
    for element in soup(["script", "style"]):
        element.decompose()

    # Get text and clean up whitespace
    text = soup.get_text(separator="\n")

    # Collapse multiple blank lines into double newlines
    text = re.sub(r"\n{3,}", "\n\n", text)

    # Strip leading/trailing whitespace from each line
    lines = [line.strip() for line in text.split("\n")]
    text = "\n".join(lines)

    # Remove leading/trailing whitespace from the whole document
    return text.strip()


async def extract_text_from_url(url: str) -> str:
    """
    Fetch plaintext content from a URL (e.g., Federal Register raw_text_url).
    Returns the raw text response.
    """
    if not url:
        return ""

    async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
        response = await client.get(url)
        response.raise_for_status()
        return response.text


def extract_text_from_pdf(pdf_path: str) -> str:
    """
    Extract text from a PDF file using pymupdf4llm.
    Returns Markdown-formatted text optimized for LLM consumption.
    """
    try:
        import pymupdf4llm
        return pymupdf4llm.to_markdown(pdf_path)
    except ImportError:
        raise RuntimeError("pymupdf4llm is required for PDF extraction. Install with: uv add pymupdf4llm")
    except Exception as e:
        raise RuntimeError(f"Failed to extract text from PDF {pdf_path}: {e}")
