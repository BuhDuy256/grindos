import asyncio
import json
import os
import re
from datetime import date, timedelta

from google.genai import types

from ai_core_service.retrieving import plan_dao, user_dao
from ai_core_service.retrieving.connection import call_gemini
from ai_core_service.thinking.guardrails import DailyPlanOutput, validate_plan_output
from ai_core_service.thinking.prompts.daily_task.service import get_hydrated_prompt

PHASE_INSTRUCTIONS: dict[str, str] = {
    "CALIBRATE": (
        "The system is initializing. Lower cognitive friction. Prioritize hyper-actionable, "
        "low-barrier Starter tasks (<5 mins) to build momentum. Keep total budget restricted."
    ),
    "CHALLENGING": (
        "The system is entering peak conflict mode. Escalate difficulty. Enforce dense, "
        "high-load Deep Work tasks. Force user into aggressive skill acquisition boundaries."
    ),
    "ROUTINE": (
        "The system is stabilizing into habits. Maintain steady load. Balance tasks evenly. "
        "If day equals 30, activate Judgment Day protocol: swap standard task array for exactly "
        "ONE comprehensive evaluation challenge task."
    ),
}


def get_phase(arc_day_index: int) -> tuple[str, str]:
    if 1 <= arc_day_index <= 5:
        phase = "CALIBRATE"
    elif 6 <= arc_day_index <= 20:
        phase = "CHALLENGING"
    else:
        phase = "ROUTINE"
    return phase, PHASE_INSTRUCTIONS[phase]


def compute_arc_day_index(arc_start_date: str, reference_date: str | None = None) -> int:
    start = date.fromisoformat(arc_start_date)
    ref = date.fromisoformat(reference_date) if reference_date else date.today()
    return (ref - start).days + 1


def compute_task_budget(difficulty_multiplier: float) -> int:
    return int(120 * difficulty_multiplier)


def _try_json_repair(raw: str) -> dict | None:
    """3-pass structural repair on malformed LLM JSON output."""
    text = raw.strip()
    # Pass 1: strip markdown code fences
    text = re.sub(r"```(?:json)?\s*|\s*```", "", text).strip()
    # Pass 2: remove trailing commas before closing brackets
    text = re.sub(r",(\s*[}\]])", r"\1", text)
    # Pass 3: extract outermost JSON object
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass
    return None


def _build_fallback_plan(user_id: int, today: str) -> tuple[str, str, list[dict]]:
    yesterday = (date.fromisoformat(today) - timedelta(days=1)).isoformat()
    yesterday_plan = plan_dao.get_daily_plan(user_id, yesterday)
    if yesterday_plan:
        prev_tasks = plan_dao.get_tasks_tree(yesterday_plan["id"])
        tasks = [
            {
                "title": "[FALLBACK] " + t['title'].replace("[FALLBACK] ", ""),
                "duration_mins": t["duration_mins"],
                "parent_id": None,
                "origin_type": "SYSTEM_GENERATED",
                "modification_state": "UNCHANGED",
            }
            for t in prev_tasks
        ]
    else:
        tasks = [
            {
                "title": "[FALLBACK] Complete your primary study objective for today.",
                "duration_mins": 120,
                "parent_id": None,
                "origin_type": "SYSTEM_GENERATED",
                "modification_state": "UNCHANGED",
            }
        ]
    system_message = (
        "[SYSTEM EMERGENCY] Neural network anomaly detected. Replaying historical directives. "
        "The system watches. Do not waste this second chance."
    )
    progress_analysis = "System error encountered during generation. Emergency protocol engaged."
    return system_message, progress_analysis, tasks


def run_thinking_for_user(user_id: int, target_date: str | None = None) -> None:
    model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash-lite")
    today = target_date or date.today().isoformat()

    # Skip if today's plan already exists (idempotent)
    if plan_dao.get_daily_plan(user_id, today):
        return

    stats = user_dao.get_player_stats(user_id)
    ctx = user_dao.get_ai_context(user_id)
    if not stats or not ctx:
        return

    metadata = ctx["metadata"]
    arc_start_date = metadata["current_arc"]["arc_start_date"]
    arc_day_index = compute_arc_day_index(arc_start_date, today)
    phase, phase_instruction = get_phase(arc_day_index)
    task_budget = compute_task_budget(stats["difficulty_multiplier"])

    week_number = ((arc_day_index - 1) // 7) + 1
    milestones = metadata["current_arc"].get("milestones", [])
    current_milestone = next(
        (m["objective"] for m in milestones if m["week_number"] == week_number),
        milestones[-1]["objective"] if milestones else "Complete your daily training tasks.",
    )

    prompt = get_hydrated_prompt(
        stats=stats,
        milestone=current_milestone,
        phase=phase,
        phase_instruction=phase_instruction,
        task_budget=task_budget,
    )

    plan_data: DailyPlanOutput | None = None
    raw_response = ""

    for attempt in range(3):
        try:
            response = call_gemini(
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=DailyPlanOutput,
                ),
                model_name=model_name,
            )
            raw_response = response.text
            plan_data = validate_plan_output(json.loads(raw_response), task_budget)
            break
        except Exception:
            if attempt < 2:
                repaired = _try_json_repair(raw_response)
                if repaired:
                    try:
                        plan_data = validate_plan_output(repaired, task_budget)
                        break
                    except Exception:
                        pass

    if plan_data:
        tasks = [t.model_dump() for t in plan_data.tasks]
        plan_dao.create_plan_with_tasks(
            user_id=user_id,
            date=today,
            system_message=plan_data.system_message,
            progress_analysis=plan_data.progress_analysis,
            tasks=tasks,
        )
    else:
        system_message, progress_analysis, tasks = _build_fallback_plan(user_id, today)
        plan_dao.create_plan_with_tasks(
            user_id=user_id,
            date=today,
            system_message=system_message,
            progress_analysis=progress_analysis,
            tasks=tasks,
        )


async def run_thinking_batch() -> dict:
    """Run the thinking pipeline for all users, parallelizing Gemini calls per timezone cohort."""
    from collections import defaultdict

    all_users = user_dao.get_all_users()
    cohorts: dict[str, list[int]] = defaultdict(list)
    for u in all_users:
        cohorts[u["timezone"]].append(u["id"])

    results = {"processed": 0, "errors": []}
    for tz, user_ids in cohorts.items():
        tasks = [asyncio.to_thread(run_thinking_for_user, uid) for uid in user_ids]
        outcomes = await asyncio.gather(*tasks, return_exceptions=True)
        for uid, outcome in zip(user_ids, outcomes):
            if isinstance(outcome, Exception):
                results["errors"].append({"user_id": uid, "error": str(outcome)})
            else:
                results["processed"] += 1

    return results
