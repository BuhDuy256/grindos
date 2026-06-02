import asyncio
import importlib
import pkgutil
from collections import defaultdict
from datetime import date
from pathlib import Path

import yaml

from ai_core_service.arc_utils import compute_arc_day_index
from ai_core_service.learning.algorithms.base import AlgoInput, BaseAlgorithm
from ai_core_service.learning.prompts.arc_bridge.service import call_arc_bridge
from ai_core_service.retrieving import plan_dao, user_dao


def _discover_algos() -> dict[str, type[BaseAlgorithm]]:
    registry: dict[str, type[BaseAlgorithm]] = {}
    import ai_core_service.learning.algorithms as pkg
    for _, name, ispkg in pkgutil.iter_modules(pkg.__path__):
        if ispkg:
            mod = importlib.import_module(f"ai_core_service.learning.algorithms.{name}.algo")
            for attr in vars(mod).values():
                if isinstance(attr, type) and issubclass(attr, BaseAlgorithm) and attr is not BaseAlgorithm:
                    registry[attr.name] = attr
    return registry


def _load_enabled(registry: dict[str, type[BaseAlgorithm]]) -> list[BaseAlgorithm]:
    cfg_path = Path(__file__).parent / "config.yaml"
    cfg = yaml.safe_load(cfg_path.read_text())
    return [
        registry[a["name"]]()
        for a in cfg.get("algorithms", [])
        if a.get("enabled") and a["name"] in registry
    ]


def _synthesize(brainstorm: dict[str, dict], tasks: list[dict]) -> dict:
    ecr_result = brainstorm.get("ecr_stat_evolution", {})
    if not ecr_result or "error" in ecr_result:
        reason = ecr_result.get("error", "ecr_stat_evolution not in brainstorm")
        return {"status": "error", "reason": reason}

    ecr_int       = ecr_result["ecr_int"]
    event         = ecr_result["event"]
    updated_stats = ecr_result["updated_stats"]
    active        = [t for t in tasks if t["modification_state"] != "DELETED"]
    completed     = sum(1 for t in active if t["is_completed"])
    total         = len(active)
    streak        = updated_stats.get("streak", 0)
    event_label   = {"POWER_UP": "POWER UP", "STABLE": "STABLE", "PENALTY": "PENALTY"}.get(event, event)

    learning_summary = (
        f"ECR {ecr_int}% [{event_label}]. "
        f"Completed {completed}/{total} tasks "
        f"({ecr_result['completed_mins']}/{ecr_result['total_mins']} min). "
        f"Streak: {streak} days."
    )
    return {
        "status": "ok",
        "ecr_int": ecr_int,
        "event": event,
        "updated_stats": updated_stats,
        "learning_summary": learning_summary,
    }


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

    stats = user_dao.get_player_stats(user_id)
    if not stats:
        return {"status": "error", "reason": "Player stats not found."}

    ctx = user_dao.get_ai_context(user_id)

    algo_input = AlgoInput(
        user_id=user_id,
        date=today,
        plan=plan,
        tasks=tasks,
        stats=stats,
        ai_context=ctx,
    )

    registry = _discover_algos()
    enabled_algos = _load_enabled(registry)

    brainstorm: dict[str, dict] = {}
    for algo in enabled_algos:
        try:
            brainstorm[algo.name] = algo.run(algo_input)
        except Exception as exc:
            brainstorm[algo.name] = {"error": str(exc)}

    synthesis = _synthesize(brainstorm, tasks)
    if synthesis["status"] == "error":
        return synthesis

    plan_dao.update_daily_plan(
        plan_id,
        ecr_score=synthesis["ecr_int"],
        learning_summary=synthesis["learning_summary"],
    )
    user_dao.update_player_stats(user_id, **{
        k: synthesis["updated_stats"][k]
        for k in ("difficulty_multiplier", "exp", "str_stat", "int_stat", "vit_stat", "streak")
    })

    metadata = ctx["metadata"]
    arc_start_date = metadata["current_arc"]["arc_start_date"]
    arc_day_index = compute_arc_day_index(arc_start_date, target_date)

    if arc_day_index == 30:
        last_30 = plan_dao.get_last_n_plans(user_id, 30)
        execution_log = _build_execution_log(last_30)
        bridge_result = call_arc_bridge(
            main_goal=ctx["main_goal"],
            execution_log=execution_log,
            final_stats=synthesis["updated_stats"],
        )
        user_dao.update_ai_context(
            user_id,
            user_persona_summary=bridge_result.user_persona_summary,
            bridge_choices=[c.model_dump() for c in bridge_result.choices],
        )

    return {
        "status": "ok",
        "ecr": synthesis["ecr_int"],
        "event": synthesis["event"],
    }


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
