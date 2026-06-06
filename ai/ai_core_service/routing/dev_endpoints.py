"""
Developer-only endpoints. Loaded only when APP_ENV=development.
Allows the team to test the full lifecycle without waiting for 4 AM / 11:59 PM cron windows.
"""

from datetime import date
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ai_core_service.arc_utils import compute_arc_day_index, compute_task_budget, get_phase
from ai_core_service.learning.orchestrator import run_learning_for_user
from ai_core_service.retrieving import plan_dao, user_dao
from ai_core_service.thinking.context import build_context
from ai_core_service.thinking.engine import run_thinking_for_user
from ai_core_service.thinking.prompts.daily_task.service import get_hydrated_prompt

dev_router = APIRouter(tags=["Developer Mode"])


class UserRequest(BaseModel):
    user_id: int
    date: Optional[str] = None


class ArcStartRequest(BaseModel):
    arc_start_date: str  # ISO format: YYYY-MM-DD


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

    thinking_ctx = build_context(
        user_id=user_id,
        stats=stats,
        ai_context=ctx,
        target_date=None,
    )
    prompt = get_hydrated_prompt(thinking_ctx)

    return {
        "arc_day_index": thinking_ctx.arc_day_index,
        "phase": thinking_ctx.phase,
        "task_budget": thinking_ctx.task_budget,
        "rendered_prompt": prompt,
    }


# ---------------------------------------------------------------------------
# Reset a user's AI context arc start date to today (plans/stats reset by web API)
# ---------------------------------------------------------------------------

@dev_router.delete("/user/{user_id}/reset")
def dev_reset_user(user_id: int):
    ctx = user_dao.get_ai_context(user_id)
    if ctx is None:
        # User might not be onboarded yet — still OK (web API already reset plans/stats)
        return {"status": "ok", "message": f"User {user_id} has no AI context — nothing to reset."}

    metadata = ctx["metadata"]
    if "current_arc" in metadata:
        metadata["current_arc"]["arc_start_date"] = date.today().isoformat()
        user_dao.update_ai_context(user_id, metadata=metadata, bridge_choices=None)

    return {"status": "ok", "message": f"User {user_id} arc reset to Day 1."}


# ---------------------------------------------------------------------------
# Override arc_start_date — enables multi-day simulation without waiting
# ---------------------------------------------------------------------------

@dev_router.put("/user/{user_id}/set-arc-start")
def dev_set_arc_start(user_id: int, req: ArcStartRequest):
    ctx = user_dao.get_ai_context(user_id)
    if not ctx:
        raise HTTPException(status_code=404, detail="AI context not found.")
    metadata = ctx["metadata"]
    metadata["current_arc"]["arc_start_date"] = req.arc_start_date
    user_dao.update_ai_context(user_id, metadata=metadata)
    return {"status": "ok", "arc_start_date": req.arc_start_date}
