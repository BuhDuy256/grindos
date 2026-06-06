import os
from datetime import date as today_date
from typing import Optional

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from api_service.connection import get_db

router = APIRouter()

AI_CORE_URL = os.getenv("AI_CORE_URL", "http://localhost:8000")


class ForgeBody(BaseModel):
    user_id: Optional[str] = None
    username: str = ""
    timezone: str = ""
    main_goal: str
    user_context: Optional[str] = None


@router.post("/v1/onboarding/forge")
def forge_onboarding(body: ForgeBody):
    try:
        resp = httpx.post(f"{AI_CORE_URL}/v1/onboarding/forge",
                          json=body.model_dump(), timeout=120)
        if not resp.is_success:
            raise HTTPException(status_code=resp.status_code,
                                detail=resp.json().get("detail", resp.text))
        return resp.json()
    except httpx.ConnectError:
        raise HTTPException(status_code=502, detail="AI Core unreachable")


# ── Models — IDs are strings to match MongoDB response format ─────────────────

class TaskOut(BaseModel):
    id: str
    plan_id: str
    parent_id: Optional[str]
    title: str
    description: Optional[str]
    duration_mins: int
    is_completed: bool
    modification_state: str
    origin_type: str = "USER_CREATED"


class DailyPlanOut(BaseModel):
    id: str
    date: str
    system_message: Optional[str]
    progress_analysis: Optional[str]
    ecr_score: Optional[float]
    user_note: Optional[str]
    tasks: list[TaskOut]


class UpdateTaskBody(BaseModel):
    title: Optional[str] = None
    duration_mins: Optional[int] = None


class CreateTaskBody(BaseModel):
    plan_id: str
    parent_id: Optional[str] = None
    title: str
    duration_mins: int


class EnsurePlanBody(BaseModel):
    user_id: int
    date: Optional[str] = None


class EndDayBody(BaseModel):
    user_id: int
    date: str
    user_note: str


# ── Helpers ───────────────────────────────────────────────────────────────────

def _fetch_plan(user_id: int, date_str: str) -> DailyPlanOut:
    with get_db() as conn:
        plan_row = conn.execute(
            "SELECT id, date, system_message, progress_analysis, ecr_score, user_note "
            "FROM daily_plans WHERE user_id = ? AND date = ?",
            (user_id, date_str),
        ).fetchone()
        if not plan_row:
            raise HTTPException(status_code=404, detail="No plan found for this date")

        task_rows = conn.execute(
            "SELECT id, daily_plan_id, parent_id, title, description, duration_mins, "
            "is_completed, modification_state, origin_type "
            "FROM tasks WHERE daily_plan_id = ? AND modification_state != 'DELETED' ORDER BY id",
            (plan_row["id"],),
        ).fetchall()

    tasks = [
        TaskOut(
            id=str(r["id"]), plan_id=str(r["daily_plan_id"]),
            parent_id=str(r["parent_id"]) if r["parent_id"] is not None else None,
            title=r["title"], description=r["description"],
            duration_mins=r["duration_mins"], is_completed=bool(r["is_completed"]),
            modification_state=r["modification_state"], origin_type=r["origin_type"],
        )
        for r in task_rows
    ]
    return DailyPlanOut(
        id=str(plan_row["id"]), date=plan_row["date"],
        system_message=plan_row["system_message"], progress_analysis=plan_row["progress_analysis"],
        ecr_score=plan_row["ecr_score"], user_note=plan_row["user_note"], tasks=tasks,
    )


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/v1/daily-plan", response_model=DailyPlanOut)
def get_daily_plan(user_id: int, date: str = ""):
    return _fetch_plan(user_id, date or str(today_date.today()))


@router.post("/v1/daily-plan", response_model=DailyPlanOut)
def ensure_daily_plan(body: EnsurePlanBody):
    """Get or create today's plan — backend owns plan lifecycle."""
    date_str = body.date or str(today_date.today())
    with get_db() as conn:
        existing = conn.execute(
            "SELECT id FROM daily_plans WHERE user_id = ? AND date = ?",
            (body.user_id, date_str),
        ).fetchone()
        if not existing:
            conn.execute(
                "INSERT INTO daily_plans (user_id, date) VALUES (?, ?)",
                (body.user_id, date_str),
            )
            conn.commit()
    return _fetch_plan(body.user_id, date_str)


@router.post("/v1/daily-plan/task", response_model=TaskOut, status_code=201)
def create_task(body: CreateTaskBody):
    if not body.title or body.duration_mins <= 0:
        raise HTTPException(status_code=400, detail="title and duration_mins required")
    plan_id_int = int(body.plan_id)
    parent_id_int = int(body.parent_id) if body.parent_id else None
    with get_db() as conn:
        plan = conn.execute("SELECT id FROM daily_plans WHERE id = ?", (plan_id_int,)).fetchone()
        if not plan:
            raise HTTPException(status_code=404, detail="Plan not found")
        cur = conn.execute(
            "INSERT INTO tasks (daily_plan_id, parent_id, title, duration_mins, "
            "is_completed, origin_type, modification_state) VALUES (?, ?, ?, ?, 0, 'USER_CREATED', 'UNCHANGED')",
            (plan_id_int, parent_id_int, body.title, body.duration_mins),
        )
        conn.commit()
        task_id = cur.lastrowid
    return TaskOut(id=str(task_id), plan_id=body.plan_id, parent_id=body.parent_id,
                   title=body.title, description=None, duration_mins=body.duration_mins,
                   is_completed=False, modification_state="UNCHANGED", origin_type="USER_CREATED")


@router.patch("/v1/daily-plan/task/{task_id}/complete")
def toggle_complete(task_id: str):
    with get_db() as conn:
        row = conn.execute("SELECT is_completed FROM tasks WHERE id = ?", (int(task_id),)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Task not found")
        new_state = 0 if row["is_completed"] else 1
        conn.execute("UPDATE tasks SET is_completed = ? WHERE id = ?", (new_state, int(task_id)))
        conn.commit()
    return {"is_completed": bool(new_state)}


@router.patch("/v1/daily-plan/task/{task_id}")
def update_task(task_id: str, body: UpdateTaskBody):
    with get_db() as conn:
        if body.title is not None:
            conn.execute("UPDATE tasks SET title = ?, modification_state = 'EDITED' WHERE id = ?",
                         (body.title, int(task_id)))
        if body.duration_mins is not None:
            conn.execute("UPDATE tasks SET duration_mins = ?, modification_state = 'EDITED' WHERE id = ?",
                         (body.duration_mins, int(task_id)))
        conn.commit()
    return {"ok": True}


@router.delete("/v1/daily-plan/task/{task_id}")
def delete_task(task_id: str):
    with get_db() as conn:
        conn.execute("UPDATE tasks SET modification_state = 'DELETED' WHERE id = ?", (int(task_id),))
        conn.commit()
    return {"ok": True}


@router.get("/v1/player/profile")
def get_player_profile(user_id: int):
    with get_db() as conn:
        row = conn.execute(
            "SELECT level, exp, str_stat, int_stat, vit_stat, streak, difficulty_multiplier "
            "FROM player_stats WHERE user_id = ?", (user_id,),
        ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Player not found")
    return dict(row)


@router.get("/v1/player/ecr-history")
def get_ecr_history(user_id: int, days: int = 7):
    with get_db() as conn:
        rows = conn.execute(
            "SELECT date, ecr_score, learning_summary FROM daily_plans "
            "WHERE user_id = ? AND ecr_score IS NOT NULL ORDER BY date DESC LIMIT ?",
            (user_id, days),
        ).fetchall()
    return {"history": [dict(r) for r in reversed(rows)]}


@router.post("/v1/daily-plan/end-day")
def end_day(body: EndDayBody):
    with get_db() as conn:
        conn.execute(
            "UPDATE daily_plans SET user_note = ? WHERE user_id = ? AND date = ?",
            (body.user_note, body.user_id, body.date),
        )
        conn.commit()
    return {"ok": True}
