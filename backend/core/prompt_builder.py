"""
Functions that assemble final prompts for Gemini API calls.

Each builder returns a (system_instruction, user_message) tuple.
system_instruction is passed to config["system_instruction"].
user_message is passed to contents= in the Gemini call.

Key rule (per Gemini best-practice): place instructions AFTER document context,
not before.
"""

import re
from typing import Any

from core.system_prompts import (
    SYSTEM_PROMPT_EXTRACT,
    SYSTEM_PROMPT_GAP_ANALYSIS,
    SYSTEM_PROMPT_ALERT_CLASSIFICATION,
)


# ---------------------------------------------------------------------------
# Utilities
# ---------------------------------------------------------------------------

def _strip_html(text: str) -> str:
    """
    Remove HTML tags and normalise whitespace from regulation full_text.
    Preserves paragraph breaks as double newlines.
    """
    text = re.sub(r"<(p|br|div|section|h[1-6]|li|tr|td|th)[^>]*>", "\n", text, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", "", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"[ \t]+", " ", text)
    return text.strip()


def _format_business_profile(business: dict) -> str:
    """Format a business profile dict into a readable block for the LLM."""
    return (
        "FACILITY PROFILE:\n"
        f"Name: {business.get('name', 'Unknown')}\n"
        f"County: {business.get('county', 'Unknown')}, North Carolina\n"
        f"Operation Type: {business.get('operation_type', 'Unknown')}\n"
        f"Head Count: {business.get('head_count', 'Unknown')} animals\n"
        f"Permit Type: {business.get('permit_type', 'Unknown')}\n"
        f"Permit Number: {business.get('permit_number', 'N/A')}\n"
        f"NAICS Code: {business.get('naics_code', '112210')} (Hog and Pig Farming)"
    )


# ---------------------------------------------------------------------------
# Builder 1: Extraction prompt
# ---------------------------------------------------------------------------

def build_extraction_prompt(regulation_text: str) -> tuple[str, str]:
    """
    Build the system instruction and user message for the extraction call.

    Args:
        regulation_text: Raw regulation text (HTML will be stripped automatically).

    Returns:
        (system_instruction, user_message) tuple.

    Note: Instruction is placed AFTER the document context per best-practice.
    """
    clean_text = _strip_html(regulation_text)

    user_message = (
        "REGULATION TEXT:\n"
        "----------------\n"
        f"{clean_text}\n"
        "----------------\n\n"
        "Extract ALL compliance requirements from the above regulation text."
    )

    return SYSTEM_PROMPT_EXTRACT, user_message


# ---------------------------------------------------------------------------
# Builder 2: Gap analysis prompt
# ---------------------------------------------------------------------------

def build_gap_analysis_prompt(
    requirements_json: str,
    business_profile: dict,
) -> tuple[str, str]:
    """
    Build the system instruction and user message for the gap analysis call.

    Args:
        requirements_json: JSON string of extracted ComplianceRequirement list.
        business_profile: Business profile dict from the database.

    Returns:
        (system_instruction, user_message) tuple.

    Note: Instruction is placed AFTER document context per best-practice.
    """
    facility_block = _format_business_profile(business_profile)

    user_message = (
        "EXTRACTED COMPLIANCE REQUIREMENTS (JSON):\n"
        "------------------------------------------\n"
        f"{requirements_json}\n"
        "------------------------------------------\n\n"
        f"{facility_block}\n\n"
        "Analyze this facility's compliance against the above requirements. "
        "Be specific to this facility."
    )

    return SYSTEM_PROMPT_GAP_ANALYSIS, user_message


# ---------------------------------------------------------------------------
# Builder 3: Alert classification prompt
# ---------------------------------------------------------------------------

def build_alert_classification_prompt(
    regulation: dict[str, Any],
    businesses: list[dict[str, Any]],
) -> tuple[str, str]:
    """
    Build the system instruction and user message for the alert classification call.

    Args:
        regulation: Regulation dict (uses title, abstract).
        businesses: List of business profile dicts.

    Returns:
        (system_instruction, user_message) tuple.

    Note: Instruction is placed AFTER document context per best-practice.
    """
    reg_block = (
        f"REGULATION:\n"
        f"Title: {regulation.get('title', 'Unknown')}\n"
        f"Agency: {regulation.get('agency', 'Unknown')}\n"
        f"Document Type: {regulation.get('document_type', 'Unknown')}\n"
        f"Publication Date: {regulation.get('publication_date', 'Unknown')}\n"
        f"Abstract: {regulation.get('abstract', 'No abstract available')}\n"
    )

    business_lines = []
    for b in businesses:
        business_lines.append(
            f"  - id={b.get('id')} | name={b.get('name')} | "
            f"county={b.get('county')} | operation_type={b.get('operation_type')} | "
            f"head_count={b.get('head_count')} | permit_type={b.get('permit_type')} | "
            f"naics={b.get('naics_code')}"
        )

    businesses_block = "FACILITY LIST:\n" + "\n".join(business_lines)

    user_message = (
        f"{reg_block}\n"
        f"{businesses_block}\n\n"
        "For each facility listed above, determine whether this regulation affects it "
        "and return the result as a JSON array."
    )

    return SYSTEM_PROMPT_ALERT_CLASSIFICATION, user_message
