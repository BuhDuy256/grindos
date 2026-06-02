"""
Developer-only endpoints. Loaded only when APP_ENV=development.
Allows the team to test the full lifecycle without waiting for 4 AM / 11:59 PM cron windows.
"""

import json
from datetime import date
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ai_core_service.learning.orchestrator import run_learning_for_user
from ai_core_service.retrieving import plan_dao, user_dao
from ai_core_service.retrieving.connection import DB_PATH, get_db
from ai_core_service.thinking.engine import (
    compute_arc_day_index,
    compute_task_budget,
    get_phase,
    run_thinking_for_user,
)
from ai_core_service.thinking.prompts.daily_task.service import get_hydrated_prompt

dev_router = APIRouter(tags=["Developer Mode"])


class UserRequest(BaseModel):
    user_id: int
    date: Optional[str] = None


# ---------------------------------------------------------------------------
# Trigger thinking pipeline for a single user immediately
# ---------------------------------------------------------------------------

@dev_router.post("/thinking/run-for-user")
def dev_run_thinking(req: UserRequest):
    if not user_dao.get_user(req.user_id):
        raise HTTPException(status_code=404, detail="User not found.")
    if not user_dao.get_player_stats(req.user_id) or not user_dao.get_ai_context(req.user_id):
        raise HTTPException(status_code=400, detail="User is not fully onboarded (missing stats or ai_context).")
    run_thinking_for_user(req.user_id, req.date)
    used_date = req.date or date.today().isoformat()
    return {"status": "ok", "message": f"Thinking pipeline executed for user {req.user_id} on {used_date}."}


# ---------------------------------------------------------------------------
# Trigger learning pipeline for a single user immediately
# ---------------------------------------------------------------------------

@dev_router.post("/learning/run-for-user")
def dev_run_learning(req: UserRequest):
    if not user_dao.get_user(req.user_id):
        raise HTTPException(status_code=404, detail="User not found.")
    result = run_learning_for_user(req.user_id, req.date)
    return {"status": "ok", "result": result}


# ---------------------------------------------------------------------------
# Preview the hydrated prompt without calling Gemini
# ---------------------------------------------------------------------------

@dev_router.get("/thinking/preview-prompt")
def dev_preview_prompt(user_id: int):
    stats = user_dao.get_player_stats(user_id)
    ctx = user_dao.get_ai_context(user_id)
    if not stats or not ctx:
        raise HTTPException(status_code=404, detail="User stats or context not found.")

    metadata = ctx["metadata"]
    arc_start_date = metadata["current_arc"]["arc_start_date"]
    arc_day_index = compute_arc_day_index(arc_start_date)
    phase, phase_instruction = get_phase(arc_day_index)
    task_budget = compute_task_budget(stats["difficulty_multiplier"])

    week_number = ((arc_day_index - 1) // 7) + 1
    milestones = metadata["current_arc"].get("milestones", [])
    current_milestone = next(
        (m["objective"] for m in milestones if m["week_number"] == week_number),
        milestones[0]["objective"] if milestones else "Complete your daily tasks.",
    )

    prompt = get_hydrated_prompt(
        stats=stats,
        milestone=current_milestone,
        phase=phase,
        phase_instruction=phase_instruction,
        task_budget=task_budget,
    )

    return {
        "arc_day_index": arc_day_index,
        "phase": phase,
        "task_budget": task_budget,
        "rendered_prompt": prompt,
    }


# ---------------------------------------------------------------------------
# Reset a user to Day 1 (wipe plans, tasks, stats) for re-testing
# ---------------------------------------------------------------------------

@dev_router.delete("/user/{user_id}/reset")
def dev_reset_user(user_id: int):
    if not user_dao.get_user(user_id):
        raise HTTPException(status_code=404, detail="User not found.")

    conn = get_db()
    try:
        # Cascade deletes plans + tasks via FK ON DELETE CASCADE
        conn.execute("DELETE FROM daily_plans WHERE user_id = ?", (user_id,))
        conn.execute(
            """UPDATE player_stats
               SET level=1, exp=0, str_stat=10, int_stat=10, vit_stat=10,
                   streak=0, difficulty_multiplier=1.00
               WHERE user_id = ?""",
            (user_id,),
        )
        # Reset arc start date to today
        ctx = conn.execute(
            "SELECT metadata FROM ai_contexts WHERE user_id = ?", (user_id,)
        ).fetchone()
        if ctx:
            metadata = json.loads(ctx["metadata"])
            metadata["current_arc"]["arc_start_date"] = date.today().isoformat()
            conn.execute(
                "UPDATE ai_contexts SET metadata = ?, bridge_choices = NULL WHERE user_id = ?",
                (json.dumps(metadata), user_id),
            )
        conn.commit()
    finally:
        conn.close()

    return {"status": "ok", "message": f"User {user_id} reset to Day 1."}


# ---------------------------------------------------------------------------
# Override arc_start_date — enables multi-day simulation without waiting
# ---------------------------------------------------------------------------

class ArcStartRequest(BaseModel):
    arc_start_date: str  # ISO format: YYYY-MM-DD


@dev_router.put("/user/{user_id}/set-arc-start")
def dev_set_arc_start(user_id: int, req: ArcStartRequest):
    ctx = user_dao.get_ai_context(user_id)
    if not ctx:
        raise HTTPException(status_code=404, detail="AI context not found.")
    metadata = ctx["metadata"]
    metadata["current_arc"]["arc_start_date"] = req.arc_start_date
    user_dao.update_ai_context(user_id, metadata=metadata)
    return {"status": "ok", "arc_start_date": req.arc_start_date}


# ---------------------------------------------------------------------------
# Dump raw SQLite tables as JSON for quick inspection
# ---------------------------------------------------------------------------

@dev_router.get("/db/dump")
def dev_db_dump():
    conn = get_db()
    try:
        tables = ["users", "player_stats", "ai_contexts", "daily_plans", "tasks"]
        dump: dict[str, list] = {}
        for table in tables:
            rows = conn.execute(f"SELECT * FROM {table} LIMIT 200").fetchall()
            dump[table] = [dict(r) for r in rows]
        return {"db_path": str(DB_PATH), "tables": dump}
    finally:
        conn.close()
