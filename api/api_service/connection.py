import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Generator

from dotenv import load_dotenv

load_dotenv()

_default_db = Path(__file__).resolve().parent.parent.parent / "db" / "grindos.db"
DB_PATH = Path(os.getenv("DATABASE_URL", str(_default_db)))


@contextmanager
def get_db() -> Generator[sqlite3.Connection, None, None]:
    """Context manager — always closes connection, even on exception."""
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False, timeout=15)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")
    try:
        yield conn
    finally:
        conn.close()


def init_db() -> None:
    with get_db() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id       INTEGER PRIMARY KEY AUTOINCREMENT,
                username VARCHAR(255) NOT NULL,
                timezone VARCHAR(100) NOT NULL
            );
        """)
        user_cols = [r[1] for r in conn.execute("PRAGMA table_info(users)").fetchall()]
        if "password_hash" not in user_cols:
            conn.execute("ALTER TABLE users ADD COLUMN password_hash TEXT")
        if "is_admin" not in user_cols:
            conn.execute("ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0")
        conn.commit()
