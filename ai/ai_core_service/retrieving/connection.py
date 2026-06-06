"""Gemini client setup. SQLite removed — data access goes through web_client.py."""
import os
from typing import Any, Optional

from pathlib import Path

from dotenv import load_dotenv
from google import genai
from google.genai import types

# Always load from ai/.env with override=True so GEMINI_MOCK is respected
# even if the var was set differently in the shell environment
_ENV_FILE = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(_ENV_FILE, override=True)

_gemini_primary: Optional[genai.Client] = None
_gemini_backup: Optional[genai.Client] = None

_RATE_LIMIT_SIGNALS = ("429", "503", "RESOURCE_EXHAUSTED", "UNAVAILABLE", "quota")


def init_gemini() -> None:
    global _gemini_primary, _gemini_backup
    api_key = os.getenv("GEMINI_API")
    if not api_key:
        raise RuntimeError("GEMINI_API environment variable is not set.")
    _gemini_primary = genai.Client(api_key=api_key)

    backup_key = os.getenv("GEMINI_API_BACKUP")
    if backup_key:
        _gemini_backup = genai.Client(api_key=backup_key)


def get_gemini_client() -> genai.Client:
    if _gemini_primary is None:
        raise RuntimeError("Gemini client not initialized. Call init_gemini() at startup.")
    return _gemini_primary


class _MockResponse:
    """Fake Gemini response for GEMINI_MOCK=true mode."""
    def __init__(self, text: str):
        self.text = text


_MOCK_FORGE = {
    "arc_name": "Arc I: The Mock Awakening",
    "milestones": [
        {"week_number": 1, "objective": "[MOCK] Establish daily practice routine"},
        {"week_number": 2, "objective": "[MOCK] Complete core fundamentals module"},
        {"week_number": 3, "objective": "[MOCK] Build first working prototype"},
        {"week_number": 4, "objective": "[MOCK] Review and consolidate all learning"},
    ],
}

_MOCK_PLAN = {
    "system_message": "[MOCK] Test protocol engaged. Execute assigned tasks.",
    "progress_analysis": "[MOCK] Automated test run — no real analysis available.",
    "tasks": [
        {"title": "[MOCK] Task Alpha", "description": "First mock task.", "duration_mins": 40, "parent_id": None, "origin_type": "SYSTEM_GENERATED", "modification_state": "UNCHANGED"},
        {"title": "[MOCK] Task Beta",  "description": "Second mock task.", "duration_mins": 40, "parent_id": None, "origin_type": "SYSTEM_GENERATED", "modification_state": "UNCHANGED"},
        {"title": "[MOCK] Task Gamma", "description": "Third mock task.", "duration_mins": 40, "parent_id": None, "origin_type": "SYSTEM_GENERATED", "modification_state": "UNCHANGED"},
    ],
}

_MOCK_ARC_BRIDGE = {
    "summary_assessment": "[MOCK] 30-day arc complete.",
    "user_persona_summary": "[MOCK] Test user — consistent performer.",
    "choices": [
        {
            "choice_id": "mock_choice_1",
            "title": "[MOCK] Continue Path",
            "description": "Keep going on the same track.",
            "new_arc_name": "Arc II: The Mock Continuation",
            "new_arc_milestones": [
                {"week_number": 1, "objective": "[MOCK] Arc II week 1"},
                {"week_number": 2, "objective": "[MOCK] Arc II week 2"},
                {"week_number": 3, "objective": "[MOCK] Arc II week 3"},
                {"week_number": 4, "objective": "[MOCK] Arc II week 4"},
            ],
        }
    ],
}


def _mock_gemini_response(config: types.GenerateContentConfig) -> _MockResponse:
    import json as _json
    schema = getattr(config, "response_schema", None)
    schema_name = getattr(schema, "__name__", "") if schema else ""
    if "ArcBridge" in schema_name:
        return _MockResponse(_json.dumps(_MOCK_ARC_BRIDGE))
    if "DailyPlan" in schema_name:
        return _MockResponse(_json.dumps(_MOCK_PLAN))
    # Default: forge
    return _MockResponse(_json.dumps(_MOCK_FORGE))


def call_gemini(
    contents: str,
    config: types.GenerateContentConfig,
    model_name: str | None = None,
) -> Any:
    """Call Gemini with automatic failover to backup key on rate-limit errors."""
    if os.getenv("GEMINI_MOCK", "").lower() == "true":
        return _mock_gemini_response(config)

    model = model_name or os.getenv("GEMINI_MODEL", "gemini-2.5-flash-lite")
    clients = [c for c in [_gemini_primary, _gemini_backup] if c is not None]

    if not clients:
        raise RuntimeError("No Gemini clients initialized.")

    last_exc: Exception | None = None
    for client in clients:
        try:
            return client.models.generate_content(
                model=model,
                contents=contents,
                config=config,
            )
        except Exception as exc:
            err = str(exc)
            if any(sig in err for sig in _RATE_LIMIT_SIGNALS):
                last_exc = exc
                continue
            raise

    raise last_exc  # type: ignore[misc]
