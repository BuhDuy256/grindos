import os

from ai_core_service.thinking.context import ThinkingContext, format_context_for_prompt


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


def get_hydrated_prompt(ctx: ThinkingContext) -> str:
    current_dir = os.path.dirname(os.path.abspath(__file__))
    return render_prompt_template(current_dir, "prompt.txt", format_context_for_prompt(ctx))
