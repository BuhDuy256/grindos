import asyncio
import json
import os
from datetime import date
from typing import Literal, Optional

from fastapi import APIRouter, HTTPException
from google.genai import types
from pydantic import BaseModel

from ai_core_service.learning.orchestrator import run_learning_batch
from ai_core_service.retrieving import plan_dao, user_dao
from ai_core_service.retrieving.connection import call_gemini
from ai_core_service.thinking.engine import run_thinking_batch
from ai_core_service.thinking.guardrails import ArcForgeOutput

router = APIRouter()


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class ForgeRequest(BaseModel):
    user_id: Optional[int] = None
    username: str
    timezone: str
    main_goal: str


class ForgeResponse(BaseModel):
    status: str
    message: str
    active_arc: dict


class EndDayRequest(BaseModel):
    user_id: int
    date: str
    user_note: str
    completed_task_ids: list[int]


class TaskModificationRequest(BaseModel):
    modification_state: Literal["EDITED", "DELETED"]
    duration_mins: Optional[int] = None


class SelectBridgeRequest(BaseModel):
    user_id: int
    selected_choice_id: str


# ---------------------------------------------------------------------------
# 1. POST /v1/onboarding/forge
# ---------------------------------------------------------------------------

@router.post("/v1/onboarding/forge", response_model=ForgeResponse)
def forge_onboarding(req: ForgeRequest):
    model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash-lite")

    if req.user_id and user_dao.get_user(req.user_id):
        raise HTTPException(status_code=409, detail="User already onboarded.")

    # Generate Arc I via Gemini BEFORE writing to DB so failed calls leave no orphan rows
    forge_prompt = (
        f"You are a narrative AI for a gamified productivity system called GrindOS.\n"
        f"A new player has declared their main goal: \"{req.main_goal}\"\n\n"
        f"Create Arc I — the first 30-day campaign arc for this player.\n"
        f"Generate an arc_name (e.g. 'Arc I: The Awakening Fog') and exactly 4 weekly milestones "
        f"that progressively build toward the main goal.\n"
        f"Keep objectives specific, actionable, and grounded in the goal domain.\n"
        f"Do NOT include text outside the JSON response."
    )

    try:
        response = call_gemini(
            contents=forge_prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=ArcForgeOutput,
            ),
            model_name=model_name,
        )
        forge_data = ArcForgeOutput(**json.loads(response.text))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI generation failed: {e}")

    # DB writes happen only after Gemini succeeds — no orphan rows on failure
    user_id = user_dao.create_user(req.username, req.timezone)
    user_dao.create_player_stats(user_id)

    today = date.today().isoformat()
    metadata = {
        "current_arc": {
            "arc_id": 1,
            "arc_name": forge_data.arc_name,
            "arc_start_date": today,
            "milestones": [m.model_dump() for m in forge_data.milestones],
        },
        "campaign_history": [],
    }
    user_dao.create_ai_context(user_id, req.main_goal, metadata)

    return ForgeResponse(
        status="success",
        message="Campaign forged successfully.",
        active_arc={
            "arc_id": 1,
            "arc_name": forge_data.arc_name,
            "milestones": [m.model_dump() for m in forge_data.milestones],
        },
    )


# ---------------------------------------------------------------------------
# 2. GET /v1/daily-plan
# ---------------------------------------------------------------------------

@router.get("/v1/daily-plan")
def get_daily_plan(user_id: int, date: str):
    plan = plan_dao.get_daily_plan(user_id, date)
    if not plan:
        raise HTTPException(status_code=404, detail="No plan found for the given date.")
    tasks = plan_dao.get_tasks_tree(plan["id"])
    return {
        "date": date,
        "system_message": plan.get("system_message"),
        "progress_analysis": plan.get("progress_analysis"),
        "tasks": [
            {
                "id": t["id"],
                "parent_id": t["parent_id"],
                "title": t["title"],
                "duration_mins": t["duration_mins"],
                "is_completed": bool(t["is_completed"]),
                "origin_type": t["origin_type"],
            }
            for t in tasks
        ],
    }


# ---------------------------------------------------------------------------
# 3. POST /v1/daily-plan/end-day
# ---------------------------------------------------------------------------

@router.post("/v1/daily-plan/end-day", status_code=202)
def end_day(req: EndDayRequest):
    plan = plan_dao.get_daily_plan(req.user_id, req.date)
    if not plan:
        raise HTTPException(status_code=404, detail="No plan found for the given date.")
    plan_dao.mark_tasks_completed(req.completed_task_ids)
    plan_dao.update_daily_plan(plan["id"], user_note=req.user_note)
    return {"status": "accepted", "message": "Logs recorded. The System will evaluate your performance at midnight."}


# ---------------------------------------------------------------------------
# 4. PATCH /v1/daily-plan/task/{task_id}
# ---------------------------------------------------------------------------

@router.patch("/v1/daily-plan/task/{task_id}")
def update_task(task_id: int, req: TaskModificationRequest):
    plan_dao.update_task_modification(
        task_id=task_id,
        modification_state=req.modification_state,
        duration_mins=req.duration_mins,
    )
    return {"status": "ok", "task_id": task_id, "modification_state": req.modification_state}


# ---------------------------------------------------------------------------
# 5. GET /v1/player/profile
# ---------------------------------------------------------------------------

@router.get("/v1/player/profile")
def get_player_profile(user_id: int):
    stats = user_dao.get_player_stats(user_id)
    if not stats:
        raise HTTPException(status_code=404, detail="Player not found.")
    return {
        "user_id": user_id,
        "stats": {
            "level": stats["level"],
            "exp": stats["exp"],
            "str_stat": stats["str_stat"],
            "int_stat": stats["int_stat"],
            "vit_stat": stats["vit_stat"],
            "streak": stats["streak"],
            "difficulty_multiplier": stats["difficulty_multiplier"],
        },
    }


# ---------------------------------------------------------------------------
# 6. GET /v1/campaign/bridge-options
# ---------------------------------------------------------------------------

@router.get("/v1/campaign/bridge-options")
def get_bridge_options(user_id: int):
    ctx = user_dao.get_ai_context(user_id)
    if not ctx:
        raise HTTPException(status_code=404, detail="User context not found.")

    metadata = ctx["metadata"]
    arc_id = metadata["current_arc"]["arc_id"]

    bridge_choices = ctx.get("bridge_choices")
    if not bridge_choices:
        raise HTTPException(
            status_code=404,
            detail="No bridge options available. Options are generated at the end of Day 30.",
        )

    choices = bridge_choices if isinstance(bridge_choices, list) else json.loads(bridge_choices)
    return {
        "current_arc_id": arc_id,
        "summary_assessment": ctx.get("user_persona_summary", "Assessment pending."),
        "choices": [
            {
                "choice_id": c["choice_id"],
                "title": c["title"],
                "description": c["description"],
            }
            for c in choices
        ],
    }


# ---------------------------------------------------------------------------
# 7. POST /v1/campaign/select-bridge
# ---------------------------------------------------------------------------

@router.post("/v1/campaign/select-bridge")
def select_bridge(req: SelectBridgeRequest):
    ctx = user_dao.get_ai_context(req.user_id)
    if not ctx:
        raise HTTPException(status_code=404, detail="User context not found.")

    bridge_choices = ctx.get("bridge_choices")
    if not bridge_choices:
        raise HTTPException(status_code=400, detail="No bridge choices available to select.")

    choices = bridge_choices if isinstance(bridge_choices, list) else json.loads(bridge_choices)
    selected = next((c for c in choices if c["choice_id"] == req.selected_choice_id), None)
    if not selected:
        raise HTTPException(status_code=400, detail=f"Choice '{req.selected_choice_id}' not found.")

    metadata = ctx["metadata"]
    old_arc = metadata["current_arc"]
    metadata["campaign_history"].append(old_arc)

    today = date.today().isoformat()
    metadata["current_arc"] = {
        "arc_id": old_arc["arc_id"] + 1,
        "arc_name": selected["new_arc_name"],
        "arc_start_date": today,
        "milestones": selected["new_arc_milestones"],
    }

    user_dao.update_ai_context(
        req.user_id,
        metadata=metadata,
        bridge_choices=None,
    )

    return {
        "status": "success",
        "message": f"Arc {old_arc['arc_id'] + 1} Activated: {selected['new_arc_name']} initialized.",
    }


# ---------------------------------------------------------------------------
# 8. POST /v1/internal/thinking/run
# ---------------------------------------------------------------------------

@router.post("/v1/internal/thinking/run")
async def trigger_thinking():
    result = await run_thinking_batch()
    return {"status": "completed", **result}


# ---------------------------------------------------------------------------
# 9. POST /v1/internal/learning/run
# ---------------------------------------------------------------------------

@router.post("/v1/internal/learning/run")
async def trigger_learning(target_date: Optional[str] = None):
    result = await run_learning_batch(target_date)
    return {"status": "completed", **result}
