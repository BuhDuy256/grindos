import json
import os

from google.genai import types

from ai_core_service.retrieving.connection import call_gemini
from ai_core_service.thinking.guardrails import ArcBridgeOutput


def render_prompt_template(service_dir: str, template_name: str, context: dict) -> str:
    prompt_path = os.path.join(service_dir, template_name)
    if not os.path.exists(prompt_path):
        raise FileNotFoundError(f"Critical System Failure: Prompt asset missing at {prompt_path}")
    with open(prompt_path, "r", encoding="utf-8") as f:
        raw_template = f.read()
    try:
        return raw_template.format(**context)
    except KeyError as e:
        raise ValueError(f"Prompt Hydration Failure: Missing context variable {e}")


def get_hydrated_arc_prompt(main_goal: str, execution_log: str, final_stats: dict) -> str:
    current_dir = os.path.dirname(os.path.abspath(__file__))
    stats_display = (
        f"Level {final_stats.get('level', 1)} | EXP {final_stats.get('exp', 0)} | "
        f"STR {final_stats.get('str_stat', 10)} | INT {final_stats.get('int_stat', 10)} | "
        f"VIT {final_stats.get('vit_stat', 10)} | Streak {final_stats.get('streak', 0)} | "
        f"Difficulty Multiplier {final_stats.get('difficulty_multiplier', 1.00):.2f}"
    )
    context = {
        "main_goal": main_goal,
        "execution_log": execution_log,
        "final_stats": stats_display,
    }
    return render_prompt_template(current_dir, "prompt.txt", context)


def call_arc_bridge(main_goal: str, execution_log: str, final_stats: dict) -> ArcBridgeOutput:
    import os as _os
    model_name = _os.getenv("GEMINI_MODEL", "gemini-2.5-flash-lite")
    prompt = get_hydrated_arc_prompt(main_goal, execution_log, final_stats)
    response = call_gemini(
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=ArcBridgeOutput,
        ),
        model_name=model_name,
    )
    data = json.loads(response.text)
    return ArcBridgeOutput(**data)
