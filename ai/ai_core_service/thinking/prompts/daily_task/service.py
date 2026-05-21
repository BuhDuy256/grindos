import os
from typing import Any


def render_prompt_template(service_dir: str, template_name: str, context: dict[str, Any]) -> str:
    prompt_path = os.path.join(service_dir, template_name)
    if not os.path.exists(prompt_path):
        raise FileNotFoundError(f"Critical System Failure: Prompt asset missing at {prompt_path}")
    with open(prompt_path, "r", encoding="utf-8") as f:
        raw_template = f.read()
    try:
        return raw_template.format(**context)
    except KeyError as e:
        raise ValueError(f"Prompt Hydration Failure: Missing context variable {e}")


def get_hydrated_prompt(
    stats: dict,
    milestone: str,
    phase: str,
    phase_instruction: str,
    task_budget: int,
) -> str:
    current_dir = os.path.dirname(os.path.abspath(__file__))
    stats_display = (
        f"Level {stats.get('level', 1)} | EXP {stats.get('exp', 0)} | "
        f"STR {stats.get('str_stat', 10)} | INT {stats.get('int_stat', 10)} | "
        f"VIT {stats.get('vit_stat', 10)} | Streak {stats.get('streak', 0)} days | "
        f"Difficulty Multiplier {stats.get('difficulty_multiplier', 1.00):.2f}"
    )
    context = {
        "user_stats": stats_display,
        "current_milestone": milestone,
        "current_phase": phase,
        "task_budget": task_budget,
        "phase_instruction": phase_instruction,
    }
    return render_prompt_template(current_dir, "prompt.txt", context)
