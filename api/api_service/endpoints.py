from datetime import date as today_date
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from api_service.connection import get_db

router = APIRouter()


# ── Models ────────────────────────────────────────────────────────────────────

class TaskOut(BaseModel):
    id: int
    plan_id: int
    parent_id: Optional[int]
    title: str
    description: Optional[str]
    duration_mins: int
    is_completed: bool
    modification_state: str


class DailyPlanOut(BaseModel):
    id: int
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
    plan_id: int
    parent_id: Optional[int] = None
    title: str
    duration_mins: int


class EndDayBody(BaseModel):
    user_id: int
    date: str
    user_note: str


# ── Helpers ───────────────────────────────────────────────────────────────────

def _fetch_plan(user_id: int, date_str: str) -> DailyPlanOut:
    conn = get_db()
    plan_row = conn.execute(
        "SELECT id, date, system_message, progress_analysis, ecr_score, user_note "
        "FROM daily_plans WHERE user_id = ? AND date = ?",
        (user_id, date_str),
    ).fetchone()
    if not plan_row:
        raise HTTPException(status_code=404, detail="No plan found for this date")

    plan_id = plan_row["id"]
    task_rows = conn.execute(
        "SELECT id, daily_plan_id, parent_id, title, description, duration_mins, is_completed, modification_state "
        "FROM tasks WHERE daily_plan_id = ? AND modification_state != 'DELETED' ORDER BY id",
        (plan_id,),
    ).fetchall()
    conn.close()

    tasks = [
        TaskOut(
            id=r["id"],
            plan_id=r["daily_plan_id"],
            parent_id=r["parent_id"],
            title=r["title"],
            description=r["description"],
            duration_mins=r["duration_mins"],
            is_completed=bool(r["is_completed"]),
            modification_state=r["modification_state"],
        )
        for r in task_rows
    ]
    return DailyPlanOut(
        id=plan_id,
        date=plan_row["date"],
        system_message=plan_row["system_message"],
        progress_analysis=plan_row["progress_analysis"],
        ecr_score=plan_row["ecr_score"],
        user_note=plan_row["user_note"],
        tasks=tasks,
    )


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/v1/daily-plan", response_model=DailyPlanOut)
def get_daily_plan(user_id: int, date: str = ""):
    return _fetch_plan(user_id, date or str(today_date.today()))


@router.post("/v1/daily-plan/task", response_model=TaskOut, status_code=201)
def create_task(body: CreateTaskBody):
    if not body.title or body.duration_mins <= 0:
        raise HTTPException(status_code=400, detail="title and duration_mins required")
    conn = get_db()
    cur = conn.execute(
        "INSERT INTO tasks (daily_plan_id, parent_id, title, duration_mins, is_completed, origin_type, modification_state) "
        "VALUES (?, ?, ?, ?, 0, 'USER_CREATED', 'UNCHANGED')",
        (body.plan_id, body.parent_id, body.title, body.duration_mins),
    )
    conn.commit()
    task_id = cur.lastrowid
    conn.close()
    return TaskOut(
        id=task_id,
        plan_id=body.plan_id,
        parent_id=body.parent_id,
        title=body.title,
        description=None,
        duration_mins=body.duration_mins,
        is_completed=False,
        modification_state="UNCHANGED",
    )


@router.patch("/v1/daily-plan/task/{task_id}/complete")
def toggle_complete(task_id: int):
    conn = get_db()
    row = conn.execute("SELECT is_completed FROM tasks WHERE id = ?", (task_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Task not found")
    new_state = 0 if row["is_completed"] else 1
    conn.execute("UPDATE tasks SET is_completed = ? WHERE id = ?", (new_state, task_id))
    conn.commit()
    conn.close()
    return {"is_completed": bool(new_state)}


@router.patch("/v1/daily-plan/task/{task_id}")
def update_task(task_id: int, body: UpdateTaskBody):
    conn = get_db()
    if body.title is not None:
        conn.execute(
            "UPDATE tasks SET title = ?, modification_state = 'EDITED' WHERE id = ?",
            (body.title, task_id),
        )
    if body.duration_mins is not None:
        conn.execute(
            "UPDATE tasks SET duration_mins = ?, modification_state = 'EDITED' WHERE id = ?",
            (body.duration_mins, task_id),
        )
    conn.commit()
    conn.close()
    return {"ok": True}


@router.delete("/v1/daily-plan/task/{task_id}")
def delete_task(task_id: int):
    conn = get_db()
    conn.execute("UPDATE tasks SET modification_state = 'DELETED' WHERE id = ?", (task_id,))
    conn.commit()
    conn.close()
    return {"ok": True}


@router.post("/v1/daily-plan/end-day")
def end_day(body: EndDayBody):
    conn = get_db()
    conn.execute(
        "UPDATE daily_plans SET user_note = ? WHERE user_id = ? AND date = ?",
        (body.user_note, body.user_id, body.date),
    )
    conn.commit()
    conn.close()
    return {"ok": True}
