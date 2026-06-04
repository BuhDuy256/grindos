import json
import os
from typing import Any, Optional

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from api_service.connection import get_db

admin_router = APIRouter(prefix="/admin")

AI_CORE_URL = os.getenv("AI_CORE_URL", "http://localhost:8000")


# ── Shared models ─────────────────────────────────────────────────────────────

class UserOut(BaseModel):
    id: int
    username: str
    timezone: str

class UserDetailOut(BaseModel):
    id: int
    username: str
    timezone: str
    is_admin: bool

class PlayerStatsOut(BaseModel):
    user_id: int
    level: int
    exp: int
    str_stat: int
    int_stat: int
    vit_stat: int
    streak: int
    difficulty_multiplier: float

class PlayerStatsPatch(BaseModel):
    level: Optional[int] = None
    exp: Optional[int] = None
    str_stat: Optional[int] = None
    int_stat: Optional[int] = None
    vit_stat: Optional[int] = None
    streak: Optional[int] = None
    difficulty_multiplier: Optional[float] = None

class AiContextOut(BaseModel):
    main_goal: str
    user_persona_summary: Optional[str] = None
    metadata: dict
    bridge_choices: Optional[list] = None

class AiContextCreate(BaseModel):
    main_goal: str
    metadata: dict

class AiContextPatch(BaseModel):
    main_goal: Optional[str] = None
    user_persona_summary: Optional[str] = None
    metadata: Optional[dict] = None
    bridge_choices: Optional[Any] = None

class TaskIn(BaseModel):
    title: str
    description: Optional[str] = None
    duration_mins: int
    parent_id: Optional[int] = None
    origin_type: str = "SYSTEM_GENERATED"
    modification_state: str = "UNCHANGED"

class PlanWithTasksBody(BaseModel):
    user_id: int
    date: str
    system_message: str
    progress_analysis: str
    tasks: list[TaskIn]

class DailyPlanPatch(BaseModel):
    ecr_score: Optional[int] = None
    user_note: Optional[str] = None
    learning_summary: Optional[str] = None
    ai_insight: Optional[str] = None

class TaskPatch(BaseModel):
    modification_state: str
    duration_mins: Optional[int] = None

class MarkCompletedBody(BaseModel):
    task_ids: list[int]

class RegisterInternalBody(BaseModel):
    username: str
    timezone: str

class RunPipelineBody(BaseModel):
    user_id: int
    date: Optional[str] = None

class OnboardBody(BaseModel):
    user_id: Optional[int] = None
    username: str = ""
    timezone: str = ""
    main_goal: str
    user_context: Optional[str] = None


# ── Users ─────────────────────────────────────────────────────────────────────

@admin_router.get("/users", response_model=list[UserOut])
def list_users():
    conn = get_db()
    rows = conn.execute("SELECT id, username, timezone FROM users ORDER BY id").fetchall()
    conn.close()
    return [UserOut(**dict(r)) for r in rows]


@admin_router.get("/user/{user_id}", response_model=UserDetailOut)
def get_user(user_id: int):
    conn = get_db()
    row = conn.execute(
        "SELECT id, username, timezone, COALESCE(is_admin, 0) as is_admin FROM users WHERE id = ?",
        (user_id,),
    ).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    return UserDetailOut(**dict(row))


# ── Player stats ──────────────────────────────────────────────────────────────

@admin_router.get("/player/profile", response_model=PlayerStatsOut)
def get_player_profile_legacy(user_id: int):
    conn = get_db()
    row = conn.execute(
        "SELECT user_id, level, exp, str_stat, int_stat, vit_stat, streak, difficulty_multiplier "
        "FROM player_stats WHERE user_id = ?", (user_id,),
    ).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    return PlayerStatsOut(**dict(row))


@admin_router.get("/user/{user_id}/stats", response_model=PlayerStatsOut)
def get_user_stats(user_id: int):
    conn = get_db()
    row = conn.execute(
        "SELECT user_id, level, exp, str_stat, int_stat, vit_stat, streak, difficulty_multiplier "
        "FROM player_stats WHERE user_id = ?", (user_id,),
    ).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Stats not found")
    return PlayerStatsOut(**dict(row))


@admin_router.patch("/user/{user_id}/stats")
def update_user_stats(user_id: int, body: PlayerStatsPatch):
    fields = body.model_dump(exclude_none=True)
    if not fields:
        return {"ok": True}
    set_clause = ", ".join(f"{k} = ?" for k in fields)
    conn = get_db()
    conn.execute(
        f"UPDATE player_stats SET {set_clause} WHERE user_id = ?",
        (*fields.values(), user_id),
    )
    conn.commit()
    conn.close()
    return {"ok": True}


# ── AI Context ────────────────────────────────────────────────────────────────

def _parse_context_row(row) -> AiContextOut:
    d = dict(row)
    d["metadata"] = json.loads(d["metadata"]) if isinstance(d["metadata"], str) else (d["metadata"] or {})
    bc = d.get("bridge_choices")
    d["bridge_choices"] = json.loads(bc) if isinstance(bc, str) and bc else (bc if isinstance(bc, list) else None)
    return AiContextOut(**d)


@admin_router.get("/user/{user_id}/context", response_model=AiContextOut)
def get_user_context(user_id: int):
    conn = get_db()
    row = conn.execute(
        "SELECT main_goal, user_persona_summary, metadata, bridge_choices "
        "FROM ai_contexts WHERE user_id = ?", (user_id,),
    ).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="AI context not found")
    return _parse_context_row(row)


@admin_router.post("/user/{user_id}/context")
def create_user_context(user_id: int, body: AiContextCreate):
    conn = get_db()
    existing = conn.execute("SELECT 1 FROM ai_contexts WHERE user_id = ?", (user_id,)).fetchone()
    if existing:
        raise HTTPException(status_code=409, detail="Context already exists")
    conn.execute(
        "INSERT INTO ai_contexts (user_id, main_goal, metadata) VALUES (?, ?, ?)",
        (user_id, body.main_goal, json.dumps(body.metadata)),
    )
    conn.commit()
    conn.close()
    return {"ok": True}


@admin_router.patch("/user/{user_id}/context")
def update_user_context(user_id: int, body: AiContextPatch):
    fields = body.model_dump(exclude_unset=True)
    if not fields:
        return {"ok": True}
    # Serialize JSON fields
    if "metadata" in fields and isinstance(fields["metadata"], dict):
        fields["metadata"] = json.dumps(fields["metadata"])
    if "bridge_choices" in fields:
        bc = fields["bridge_choices"]
        fields["bridge_choices"] = json.dumps(bc) if bc is not None else None
    allowed = {"main_goal", "user_persona_summary", "metadata", "bridge_choices"}
    cols = {k: v for k, v in fields.items() if k in allowed}
    set_clause = ", ".join(f"{k} = ?" for k in cols)
    conn = get_db()
    conn.execute(
        f"UPDATE ai_contexts SET {set_clause} WHERE user_id = ?",
        (*cols.values(), user_id),
    )
    conn.commit()
    conn.close()
    return {"ok": True}


# ── Daily Plans ───────────────────────────────────────────────────────────────

@admin_router.get("/daily-plan")
def get_daily_plan(user_id: int, date: str):
    conn = get_db()
    row = conn.execute(
        "SELECT id, date, system_message, progress_analysis, ecr_score, user_note, "
        "learning_summary, ai_insight FROM daily_plans WHERE user_id = ? AND date = ?",
        (user_id, date),
    ).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Plan not found")
    return dict(row)


@admin_router.post("/daily-plan/with-tasks")
def create_plan_with_tasks(body: PlanWithTasksBody):
    conn = get_db()
    try:
        cursor = conn.execute(
            "INSERT INTO daily_plans (user_id, date, system_message, progress_analysis) VALUES (?, ?, ?, ?)",
            (body.user_id, body.date, body.system_message, body.progress_analysis),
        )
        plan_id = cursor.lastrowid
        conn.executemany(
            "INSERT INTO tasks (daily_plan_id, parent_id, title, description, duration_mins, origin_type, modification_state) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
            [
                (plan_id, t.parent_id, t.title, t.description, t.duration_mins, t.origin_type, t.modification_state)
                for t in body.tasks
            ],
        )
        conn.commit()
        return {"plan_id": plan_id}
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


@admin_router.patch("/daily-plan/{plan_id}")
def update_daily_plan(plan_id: int, body: DailyPlanPatch):
    fields = body.model_dump(exclude_none=True)
    if not fields:
        return {"ok": True}
    allowed = {"ecr_score", "user_note", "learning_summary", "ai_insight"}
    cols = {k: v for k, v in fields.items() if k in allowed}
    set_clause = ", ".join(f"{k} = ?" for k in cols)
    conn = get_db()
    conn.execute(f"UPDATE daily_plans SET {set_clause} WHERE id = ?", (*cols.values(), plan_id))
    conn.commit()
    conn.close()
    return {"ok": True}


@admin_router.get("/user/{user_id}/daily-plans")
def get_last_n_plans(user_id: int, limit: int = 30):
    conn = get_db()
    rows = conn.execute(
        "SELECT id, date, ecr_score, user_note, learning_summary "
        "FROM daily_plans WHERE user_id = ? ORDER BY date DESC LIMIT ?",
        (user_id, limit),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


# ── Tasks ─────────────────────────────────────────────────────────────────────

@admin_router.get("/daily-plan/{plan_id}/tasks")
def get_plan_tasks(plan_id: int, format: str = "flat"):
    conn = get_db()
    if format == "tree":
        rows = conn.execute(
            """
            WITH RECURSIVE task_tree AS (
                SELECT id, daily_plan_id, parent_id, title, description, duration_mins,
                       is_completed, origin_type, modification_state, 0 AS depth
                FROM tasks WHERE daily_plan_id = ? AND parent_id IS NULL
                UNION ALL
                SELECT t.id, t.daily_plan_id, t.parent_id, t.title, t.description, t.duration_mins,
                       t.is_completed, t.origin_type, t.modification_state, tt.depth + 1
                FROM tasks t INNER JOIN task_tree tt ON t.parent_id = tt.id
            )
            SELECT * FROM task_tree ORDER BY depth, id
            """,
            (plan_id,),
        ).fetchall()
    else:
        rows = conn.execute("SELECT * FROM tasks WHERE daily_plan_id = ?", (plan_id,)).fetchall()
    conn.close()
    return [dict(r) for r in rows]


@admin_router.patch("/task/{task_id}")
def update_task(task_id: int, body: TaskPatch):
    conn = get_db()
    if body.duration_mins is not None:
        conn.execute(
            "UPDATE tasks SET modification_state = ?, duration_mins = ? WHERE id = ?",
            (body.modification_state, body.duration_mins, task_id),
        )
    else:
        conn.execute(
            "UPDATE tasks SET modification_state = ? WHERE id = ?",
            (body.modification_state, task_id),
        )
    conn.commit()
    conn.close()
    return {"ok": True}


@admin_router.patch("/tasks/mark-completed")
def mark_tasks_completed(body: MarkCompletedBody):
    if not body.task_ids:
        return {"ok": True}
    placeholders = ",".join("?" * len(body.task_ids))
    conn = get_db()
    conn.execute(f"UPDATE tasks SET is_completed = 1 WHERE id IN ({placeholders})", body.task_ids)
    conn.commit()
    conn.close()
    return {"ok": True}


# ── Internal registration (no password) ──────────────────────────────────────

@admin_router.post("/auth/register-internal")
def register_internal(body: RegisterInternalBody):
    conn = get_db()
    cursor = conn.execute(
        "INSERT INTO users (username, timezone) VALUES (?, ?)",
        (body.username.strip(), body.timezone),
    )
    user_id = cursor.lastrowid
    conn.execute("INSERT OR IGNORE INTO player_stats (user_id) VALUES (?)", (user_id,))
    conn.commit()
    conn.close()
    return {"user_id": user_id}


# ── Pipeline proxies (forward to AI Core) ────────────────────────────────────

def _proxy(method: str, path: str, body: dict | None = None):
    try:
        resp = httpx.request(method, f"{AI_CORE_URL}{path}", json=body, timeout=120)
        return resp.json()
    except httpx.ConnectError:
        raise HTTPException(status_code=502, detail="AI Core unreachable — is it running on port 8000?")


@admin_router.post("/thinking/run")
def run_thinking(body: RunPipelineBody):
    return _proxy("POST", "/dev/thinking/run-for-user", body.model_dump(exclude_none=True))


@admin_router.post("/learning/run")
def run_learning(body: RunPipelineBody):
    return _proxy("POST", "/dev/learning/run-for-user", body.model_dump(exclude_none=True))


@admin_router.delete("/user/{user_id}/reset")
def reset_user(user_id: int):
    return _proxy("DELETE", f"/dev/user/{user_id}/reset")


@admin_router.post("/onboarding/forge")
def onboarding_forge(body: OnboardBody):
    return _proxy("POST", "/v1/onboarding/forge", body.model_dump())
