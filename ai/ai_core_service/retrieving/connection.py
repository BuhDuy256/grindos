import os
import sqlite3
from pathlib import Path
from typing import Any, Optional

from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

DB_PATH = Path(__file__).parent.parent.parent / "grindos.db"

_gemini_primary: Optional[genai.Client] = None
_gemini_backup: Optional[genai.Client] = None

_RATE_LIMIT_SIGNALS = ("429", "503", "RESOURCE_EXHAUSTED", "UNAVAILABLE", "quota")


def get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db() -> None:
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id       INTEGER PRIMARY KEY AUTOINCREMENT,
            username VARCHAR(255) NOT NULL,
            timezone VARCHAR(100) NOT NULL
        );

        CREATE TABLE IF NOT EXISTS player_stats (
            user_id              INTEGER PRIMARY KEY,
            level                INTEGER NOT NULL DEFAULT 1,
            exp                  INTEGER NOT NULL DEFAULT 0,
            str_stat             INTEGER NOT NULL DEFAULT 10,
            int_stat             INTEGER NOT NULL DEFAULT 10,
            vit_stat             INTEGER NOT NULL DEFAULT 10,
            streak               INTEGER NOT NULL DEFAULT 0,
            difficulty_multiplier REAL    NOT NULL DEFAULT 1.00,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS ai_contexts (
            user_id              INTEGER PRIMARY KEY,
            main_goal            TEXT    NOT NULL,
            user_persona_summary TEXT,
            metadata             TEXT    NOT NULL DEFAULT '{}',
            bridge_choices       TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS daily_plans (
            id               INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id          INTEGER NOT NULL,
            date             TEXT    NOT NULL,
            progress_analysis TEXT,
            system_message   TEXT,
            ecr_score        INTEGER,
            user_note        TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS tasks (
            id                 INTEGER PRIMARY KEY AUTOINCREMENT,
            daily_plan_id      INTEGER      NOT NULL,
            parent_id          INTEGER,
            title              VARCHAR(500) NOT NULL,
            duration_mins      INTEGER      NOT NULL,
            is_completed       INTEGER      NOT NULL DEFAULT 0,
            origin_type        VARCHAR(50)  NOT NULL,
            modification_state VARCHAR(50)  NOT NULL DEFAULT 'UNCHANGED',
            FOREIGN KEY (daily_plan_id) REFERENCES daily_plans(id) ON DELETE CASCADE,
            FOREIGN KEY (parent_id)     REFERENCES tasks(id)       ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_daily_plans_user_date ON daily_plans(user_id, date);
        CREATE INDEX IF NOT EXISTS idx_tasks_plan_parent     ON tasks(daily_plan_id, parent_id);
    """)
    conn.commit()
    conn.close()


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
    """Return primary client (for callers that manage their own retry logic)."""
    if _gemini_primary is None:
        raise RuntimeError("Gemini client not initialized. Call init_gemini() at startup.")
    return _gemini_primary


def call_gemini(
    contents: str,
    config: types.GenerateContentConfig,
    model_name: str | None = None,
) -> Any:
    """
    Call Gemini with automatic failover to backup key on rate-limit errors.
    Tries primary first; if a 429/503/RESOURCE_EXHAUSTED is raised, retries
    once with the backup key (GEMINI_API_BACKUP).
    """
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
                continue          # try next key
            raise                 # non-rate-limit error — propagate immediately

    raise last_exc  # both keys exhausted
