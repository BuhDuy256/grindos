import os
import sqlite3
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

_default_db = Path(__file__).resolve().parent.parent.parent / "db" / "grindos.db"
DB_PATH = Path(os.getenv("DATABASE_URL", str(_default_db)))


def get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn
