import asyncio
import json
import os
import re
from datetime import date, timedelta

from google.genai import types

from ai_core_service.arc_utils import compute_arc_day_index, compute_task_budget, get_phase
from ai_core_service.retrieving import plan_dao, user_dao
from ai_core_service.retrieving.connection import call_gemini
from ai_core_service.thinking.context import build_context
from ai_core_service.thinking.guardrails import DailyPlanOutput, validate_plan_output
from ai_core_service.thinking.prompts.daily_task.service import get_hydrated_prompt


def _try_json_repair(raw: str) -> dict | None:
    """3-pass structural repair on malformed LLM JSON output."""
    text = raw.strip()
    text = re.sub(r"```(?:json)?\s*|\s*```", "", text).strip()
    text = re.sub(r",(\s*[}\]])", r"\1", text)
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
                "title": "[FALLBACK] " + t["title"].replace("[FALLBACK] ", ""),
                "description": t.get("description"),
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
                "description": None,
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

    # 1. Get or create plan — backend owns plan lifecycle
    plan = plan_dao.ensure_plan(user_id, today)
    plan_id = plan["id"]

    # 2. Idempotency: skip if AI tasks already exist
    existing_tasks = plan_dao.get_plan_tasks_flat(plan_id)
    if any(t.get("origin_type") == "SYSTEM_GENERATED" for t in existing_tasks):
        return

    # 3. Build context + call Gemini
    stats = user_dao.get_player_stats(user_id)
    ctx = user_dao.get_ai_context(user_id)
    if not stats or not ctx:
        return

    thinking_ctx = build_context(
        user_id=user_id,
        stats=stats,
        ai_context=ctx,
        target_date=today,
    )

    prompt = get_hydrated_prompt(thinking_ctx)

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
            plan_data = validate_plan_output(json.loads(raw_response), thinking_ctx.task_budget)
            break
        except Exception:
            if attempt < 2:
                repaired = _try_json_repair(raw_response)
                if repaired:
                    try:
                        plan_data = validate_plan_output(repaired, thinking_ctx.task_budget)
                        break
                    except Exception:
                        pass

    if plan_data:
        # 4. Update plan metadata (system_message, progress_analysis)
        plan_dao.update_daily_plan(plan_id,
            system_message=plan_data.system_message,
            progress_analysis=plan_data.progress_analysis)
        # 5. Add AI tasks to the plan
        plan_dao.add_tasks_to_plan(plan_id, [t.model_dump() for t in plan_data.tasks])
    else:
        system_message, progress_analysis, fallback_tasks = _build_fallback_plan(user_id, today)
        plan_dao.update_daily_plan(plan_id,
            system_message=system_message,
            progress_analysis=progress_analysis)
        plan_dao.add_tasks_to_plan(plan_id, fallback_tasks)


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
