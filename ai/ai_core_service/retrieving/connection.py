"""Gemini client setup. SQLite removed — data access goes through web_client.py."""
import os
from typing import Any, Optional

from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

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


def call_gemini(
    contents: str,
    config: types.GenerateContentConfig,
    model_name: str | None = None,
) -> Any:
    """Call Gemini with automatic failover to backup key on rate-limit errors."""
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
