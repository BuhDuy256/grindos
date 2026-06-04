import sqlite3
import os
from pathlib import Path

db_path = Path(__file__).resolve().parent.parent / "db" / "grindos.db"
conn = sqlite3.connect(str(db_path))

try:
    conn.execute("ALTER TABLE tasks ADD COLUMN focus_time_seconds INTEGER NOT NULL DEFAULT 0")
    print("Added focus_time_seconds to tasks table.")
except sqlite3.OperationalError as e:
    if "duplicate column name" in str(e).lower():
        print("Column already exists.")
    else:
        print(f"Error: {e}")

conn.commit()
conn.close()
