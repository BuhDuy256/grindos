from dataclasses import dataclass
from typing import Optional

from ai_core_service.arc_utils import compute_arc_day_index, compute_task_budget, get_phase
from ai_core_service.retrieving import plan_dao


@dataclass
class ThinkingContext:
    # Player state
    stats: dict
    user_persona_summary: Optional[str]

    # Arc position
    arc_day_index: int
    phase: str
    phase_instruction: str
    task_budget: int
    current_milestone: str

    # Behavioral history — last 5 days (oldest → newest)
    recent_history: list[dict]


def _format_recent_history(history: list[dict]) -> str:
    if not history:
        return "None — this is the player's first day."

    lines = []
    for entry in history:
        summary = entry.get("learning_summary") or (
            f"ECR {entry['ecr_score']}%" if entry["ecr_score"] is not None else "ECR not yet calculated"
        )
        note = f"\n    Player note: \"{entry['user_note']}\"" if entry["user_note"] else ""
        lines.append(f"\n[{entry['date']}] {summary}{note}")
        for t in entry["tasks"]:
            tick = "✓" if t["is_completed"] else "✗"
            lines.append(f"  {tick} {t['duration_mins']}m — {t['title']}")

    return "\n".join(lines)


def build_context(
    user_id: int,
    stats: dict,
    ai_context: dict,
    target_date: Optional[str],
) -> "ThinkingContext":
    from datetime import date as date_cls

    today = target_date or str(date_cls.today())
    metadata = ai_context["metadata"]
    arc_start_date = metadata["current_arc"]["arc_start_date"]

    arc_day_index = compute_arc_day_index(arc_start_date, today)
    phase, phase_instruction = get_phase(arc_day_index)
    task_budget = compute_task_budget(stats["difficulty_multiplier"])

    week_number = min(((arc_day_index - 1) // 7) + 1, 4)
    milestones = metadata["current_arc"].get("milestones", [])
    current_milestone = next(
        (m["objective"] for m in milestones if m["week_number"] == week_number),
        milestones[-1]["objective"] if milestones else "Complete your daily training tasks.",
    )

    # Fetch last 5 completed days (exclude today)
    all_plans = plan_dao.get_last_n_plans(user_id, n=6)
    past_plans = [p for p in all_plans
                  if p["date"] != today and p.get("ecr_score") is not None][:5]
    past_plans.reverse()  # oldest first

    recent_history = []
    for plan in past_plans:
        tasks = plan_dao.get_tasks_tree(plan["id"])
        recent_history.append({
            "date": plan["date"],
            "ecr_score": plan["ecr_score"],
            "user_note": plan["user_note"],
            "learning_summary": plan.get("learning_summary"),
            "tasks": tasks,
        })

    return ThinkingContext(
        stats=stats,
        user_persona_summary=ai_context.get("user_persona_summary"),
        arc_day_index=arc_day_index,
        phase=phase,
        phase_instruction=phase_instruction,
        task_budget=task_budget,
        current_milestone=current_milestone,
        recent_history=recent_history,
    )


def format_context_for_prompt(ctx: ThinkingContext) -> dict:
    stats = ctx.stats
    stats_display = (
        f"Level {stats.get('level', 1)} | EXP {stats.get('exp', 0)} | "
        f"STR {stats.get('str_stat', 10)} | INT {stats.get('int_stat', 10)} | "
        f"VIT {stats.get('vit_stat', 10)} | Streak {stats.get('streak', 0)} days | "
        f"Multiplier {stats.get('difficulty_multiplier', 1.00):.2f}"
    )
    return {
        "user_stats": stats_display,
        "current_milestone": ctx.current_milestone,
        "current_phase": ctx.phase,
        "task_budget": ctx.task_budget,
        "phase_instruction": ctx.phase_instruction,
        "recent_history": _format_recent_history(ctx.recent_history),
    }
