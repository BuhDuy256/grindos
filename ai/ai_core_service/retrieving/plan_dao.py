from typing import Optional

from .connection import get_db


def create_daily_plan(user_id: int, date: str) -> int:
    conn = get_db()
    try:
        cursor = conn.execute(
            "INSERT INTO daily_plans (user_id, date) VALUES (?, ?)",
            (user_id, date),
        )
        conn.commit()
        return cursor.lastrowid
    finally:
        conn.close()


def get_daily_plan(user_id: int, date: str) -> Optional[dict]:
    conn = get_db()
    try:
        row = conn.execute(
            "SELECT * FROM daily_plans WHERE user_id = ? AND date = ?",
            (user_id, date),
        ).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def update_daily_plan(plan_id: int, **fields) -> None:
    if not fields:
        return
    allowed = {"progress_analysis", "system_message", "ecr_score", "user_note"}
    cols = {k: v for k, v in fields.items() if k in allowed}
    if not cols:
        return
    set_clause = ", ".join(f"{k} = ?" for k in cols)
    conn = get_db()
    try:
        conn.execute(
            f"UPDATE daily_plans SET {set_clause} WHERE id = ?",
            (*cols.values(), plan_id),
        )
        conn.commit()
    finally:
        conn.close()


def bulk_create_tasks(plan_id: int, tasks: list[dict]) -> None:
    conn = get_db()
    try:
        conn.executemany(
            """INSERT INTO tasks
               (daily_plan_id, parent_id, title, duration_mins, origin_type, modification_state)
               VALUES (:daily_plan_id, :parent_id, :title, :duration_mins, :origin_type, :modification_state)""",
            [
                {
                    "daily_plan_id": plan_id,
                    "parent_id": t.get("parent_id"),
                    "title": t["title"],
                    "duration_mins": t["duration_mins"],
                    "origin_type": t.get("origin_type", "SYSTEM_GENERATED"),
                    "modification_state": t.get("modification_state", "UNCHANGED"),
                }
                for t in tasks
            ],
        )
        conn.commit()
    finally:
        conn.close()


def get_tasks_tree(plan_id: int) -> list[dict]:
    """Retrieve the full task tree using a recursive CTE — no loop queries."""
    conn = get_db()
    try:
        rows = conn.execute(
            """
            WITH RECURSIVE task_tree AS (
                SELECT id, daily_plan_id, parent_id, title, duration_mins,
                       is_completed, origin_type, modification_state, 0 AS depth
                FROM   tasks
                WHERE  daily_plan_id = ? AND parent_id IS NULL

                UNION ALL

                SELECT t.id, t.daily_plan_id, t.parent_id, t.title, t.duration_mins,
                       t.is_completed, t.origin_type, t.modification_state, tt.depth + 1
                FROM   tasks t
                INNER JOIN task_tree tt ON t.parent_id = tt.id
            )
            SELECT * FROM task_tree ORDER BY depth, id
            """,
            (plan_id,),
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def get_plan_tasks_flat(plan_id: int) -> list[dict]:
    conn = get_db()
    try:
        rows = conn.execute(
            "SELECT * FROM tasks WHERE daily_plan_id = ?", (plan_id,)
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def mark_tasks_completed(task_ids: list[int]) -> None:
    if not task_ids:
        return
    placeholders = ",".join("?" * len(task_ids))
    conn = get_db()
    try:
        conn.execute(
            f"UPDATE tasks SET is_completed = 1 WHERE id IN ({placeholders})",
            task_ids,
        )
        conn.commit()
    finally:
        conn.close()


def update_task_modification(
    task_id: int,
    modification_state: str,
    duration_mins: Optional[int] = None,
) -> None:
    """Sync task edit/delete state sent from the Web Backend."""
    conn = get_db()
    try:
        if duration_mins is not None:
            conn.execute(
                "UPDATE tasks SET modification_state = ?, duration_mins = ? WHERE id = ?",
                (modification_state, duration_mins, task_id),
            )
        else:
            conn.execute(
                "UPDATE tasks SET modification_state = ? WHERE id = ?",
                (modification_state, task_id),
            )
        conn.commit()
    finally:
        conn.close()


def get_last_n_plans(user_id: int, n: int = 30) -> list[dict]:
    conn = get_db()
    try:
        rows = conn.execute(
            "SELECT * FROM daily_plans WHERE user_id = ? ORDER BY date DESC LIMIT ?",
            (user_id, n),
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def create_plan_with_tasks(
    user_id: int,
    date: str,
    system_message: str,
    progress_analysis: str,
    tasks: list[dict],
) -> int:
    """Atomic write: create daily_plan + tasks in a single transaction."""
    conn = get_db()
    try:
        cursor = conn.execute(
            """INSERT INTO daily_plans (user_id, date, system_message, progress_analysis)
               VALUES (?, ?, ?, ?)""",
            (user_id, date, system_message, progress_analysis),
        )
        plan_id = cursor.lastrowid
        conn.executemany(
            """INSERT INTO tasks
               (daily_plan_id, parent_id, title, duration_mins, origin_type, modification_state)
               VALUES (?, ?, ?, ?, ?, ?)""",
            [
                (
                    plan_id,
                    t.get("parent_id"),
                    t["title"],
                    t["duration_mins"],
                    t.get("origin_type", "SYSTEM_GENERATED"),
                    t.get("modification_state", "UNCHANGED"),
                )
                for t in tasks
            ],
        )
        conn.commit()
        return plan_id
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
