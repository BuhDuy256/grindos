"""Run this from the grindos/ root: python print_prompt.py"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "ai"))
os.chdir(os.path.join(os.path.dirname(__file__), "ai"))

from dotenv import load_dotenv
load_dotenv("ai/.env" if os.path.exists("ai/.env") else ".env")

from ai_core_service.retrieving.connection import init_db
from ai_core_service.retrieving import user_dao
from ai_core_service.thinking.engine import get_phase, compute_arc_day_index, compute_task_budget
from ai_core_service.thinking.context import build_context
from ai_core_service.thinking.prompts.daily_task.service import get_hydrated_prompt

init_db()

USER_ID = 3

stats = user_dao.get_player_stats(USER_ID)
ctx   = user_dao.get_ai_context(USER_ID)

thinking_ctx = build_context(
    user_id=USER_ID,
    stats=stats,
    ai_context=ctx,
    target_date=None,
    get_phase_fn=get_phase,
    compute_arc_day_fn=compute_arc_day_index,
    compute_budget_fn=compute_task_budget,
)

prompt = get_hydrated_prompt(thinking_ctx)

out_path = os.path.join(os.path.dirname(__file__), "example_request_prompt.txt")
with open(out_path, "w", encoding="utf-8") as f:
    f.write(prompt)

print(f"Prompt written to {out_path}")
print(f"--- Arc Day {thinking_ctx.arc_day_index} | Phase {thinking_ctx.phase} | Budget {thinking_ctx.task_budget}m | History {len(thinking_ctx.recent_history)} days ---")
