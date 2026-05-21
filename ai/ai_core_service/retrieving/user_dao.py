import json
from typing import Optional

from .connection import get_db


def create_user(username: str, timezone: str) -> int:
    conn = get_db()
    try:
        cursor = conn.execute(
            "INSERT INTO users (username, timezone) VALUES (?, ?)",
            (username, timezone),
        )
        conn.commit()
        return cursor.lastrowid
    finally:
        conn.close()


def get_user(user_id: int) -> Optional[dict]:
    conn = get_db()
    try:
        row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def get_all_users() -> list[dict]:
    conn = get_db()
    try:
        rows = conn.execute("SELECT * FROM users").fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def create_player_stats(user_id: int) -> None:
    conn = get_db()
    try:
        conn.execute(
            """INSERT INTO player_stats
               (user_id, level, exp, str_stat, int_stat, vit_stat, streak, difficulty_multiplier)
               VALUES (?, 1, 0, 10, 10, 10, 0, 1.00)""",
            (user_id,),
        )
        conn.commit()
    finally:
        conn.close()


def get_player_stats(user_id: int) -> Optional[dict]:
    conn = get_db()
    try:
        row = conn.execute(
            "SELECT * FROM player_stats WHERE user_id = ?", (user_id,)
        ).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def update_player_stats(user_id: int, **fields) -> None:
    if not fields:
        return
    allowed = {
        "level", "exp", "str_stat", "int_stat", "vit_stat",
        "streak", "difficulty_multiplier",
    }
    cols = {k: v for k, v in fields.items() if k in allowed}
    if not cols:
        return
    set_clause = ", ".join(f"{k} = ?" for k in cols)
    conn = get_db()
    try:
        conn.execute(
            f"UPDATE player_stats SET {set_clause} WHERE user_id = ?",
            (*cols.values(), user_id),
        )
        conn.commit()
    finally:
        conn.close()


def create_ai_context(user_id: int, main_goal: str, metadata: dict) -> None:
    conn = get_db()
    try:
        conn.execute(
            "INSERT INTO ai_contexts (user_id, main_goal, metadata) VALUES (?, ?, ?)",
            (user_id, main_goal, json.dumps(metadata)),
        )
        conn.commit()
    finally:
        conn.close()


def get_ai_context(user_id: int) -> Optional[dict]:
    conn = get_db()
    try:
        row = conn.execute(
            "SELECT * FROM ai_contexts WHERE user_id = ?", (user_id,)
        ).fetchone()
        if not row:
            return None
        ctx = dict(row)
        ctx["metadata"] = json.loads(ctx["metadata"])
        if ctx.get("bridge_choices"):
            ctx["bridge_choices"] = json.loads(ctx["bridge_choices"])
        return ctx
    finally:
        conn.close()


def update_ai_context(user_id: int, **fields) -> None:
    if not fields:
        return
    allowed = {"main_goal", "user_persona_summary", "metadata", "bridge_choices"}
    cols = {}
    for k, v in fields.items():
        if k not in allowed:
            continue
        if v is None:
            cols[k] = None
        elif k in ("metadata", "bridge_choices") and not isinstance(v, str):
            cols[k] = json.dumps(v)
        else:
            cols[k] = v
    if not cols:
        return
    set_clause = ", ".join(f"{k} = ?" for k in cols)
    conn = get_db()
    try:
        conn.execute(
            f"UPDATE ai_contexts SET {set_clause} WHERE user_id = ?",
            (*cols.values(), user_id),
        )
        conn.commit()
    finally:
        conn.close()
