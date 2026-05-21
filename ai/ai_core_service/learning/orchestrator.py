import asyncio
import json
from collections import defaultdict
from datetime import date, timedelta

from ai_core_service.learning.math_stats import apply_stat_evolution, compute_ecr
from ai_core_service.learning.prompts.arc_bridge.service import call_arc_bridge
from ai_core_service.retrieving import plan_dao, user_dao
from ai_core_service.thinking.engine import compute_arc_day_index


def _build_execution_log(plans: list[dict]) -> str:
    lines = []
    for p in plans:
        ecr = p.get("ecr_score") or 0
        note = p.get("user_note") or "(no note)"
        lines.append(f"Date {p['date']}: ECR={ecr}%, Note: {note}")
    return "\n".join(lines) if lines else "No execution data available."


def run_learning_for_user(user_id: int, target_date: str | None = None) -> dict:
    today = target_date or date.today().isoformat()

    plan = plan_dao.get_daily_plan(user_id, today)
    if not plan:
        return {"status": "skipped", "reason": "No plan found for today."}

    plan_id = plan["id"]
    tasks = plan_dao.get_plan_tasks_flat(plan_id)

    completed_mins = sum(t["duration_mins"] for t in tasks if t["is_completed"] and t["modification_state"] != "DELETED")
    total_mins = sum(t["duration_mins"] for t in tasks if t["modification_state"] != "DELETED")

    ecr = compute_ecr(completed_mins, total_mins)
    ecr_int = round(ecr)

    stats = user_dao.get_player_stats(user_id)
    if not stats:
        return {"status": "error", "reason": "Player stats not found."}

    updated_stats, event = apply_stat_evolution(stats, ecr)
    plan_dao.update_daily_plan(plan_id, ecr_score=ecr_int)
    user_dao.update_player_stats(user_id, **{
        k: updated_stats[k]
        for k in ("difficulty_multiplier", "exp", "str_stat", "int_stat", "vit_stat", "streak")
    })

    ctx = user_dao.get_ai_context(user_id)
    metadata = ctx["metadata"]
    arc_start_date = metadata["current_arc"]["arc_start_date"]
    arc_day_index = compute_arc_day_index(arc_start_date, target_date)

    if arc_day_index == 30:
        last_30 = plan_dao.get_last_n_plans(user_id, 30)
        execution_log = _build_execution_log(last_30)
        bridge_result = call_arc_bridge(
            main_goal=ctx["main_goal"],
            execution_log=execution_log,
            final_stats=updated_stats,
        )
        user_dao.update_ai_context(
            user_id,
            user_persona_summary=bridge_result.user_persona_summary,
            bridge_choices=[c.model_dump() for c in bridge_result.choices],
        )

    return {"status": "ok", "ecr": ecr_int, "event": event}


async def run_learning_batch(target_date: str | None = None) -> dict:
    all_users = user_dao.get_all_users()
    cohorts: dict[str, list[int]] = defaultdict(list)
    for u in all_users:
        cohorts[u["timezone"]].append(u["id"])

    results = {"processed": 0, "errors": []}
    for tz, user_ids in cohorts.items():
        tasks = [asyncio.to_thread(run_learning_for_user, uid, target_date) for uid in user_ids]
        outcomes = await asyncio.gather(*tasks, return_exceptions=True)
        for uid, outcome in zip(user_ids, outcomes):
            if isinstance(outcome, Exception):
                results["errors"].append({"user_id": uid, "error": str(outcome)})
            else:
                results["processed"] += 1

    return results
