"""plan_dao — HTTP wrapper. Same interface as before; backed by web_client."""
from typing import Optional
from . import web_client as _c


def get_daily_plan(user_id: int, date: str) -> Optional[dict]:
    return _c.get_daily_plan(user_id, date)


def update_daily_plan(plan_id: int, **fields) -> None:
    _c.update_daily_plan(plan_id, **fields)


def create_plan_with_tasks(
    user_id: int, date: str, system_message: str, progress_analysis: str, tasks: list[dict]
) -> int:
    return _c.create_plan_with_tasks(user_id, date, system_message, progress_analysis, tasks)


def bulk_create_tasks(plan_id: int, tasks: list[dict]) -> None:
    _c.bulk_create_tasks(plan_id, tasks)


def get_tasks_tree(plan_id: int) -> list[dict]:
    return _c.get_tasks_tree(plan_id)


def get_plan_tasks_flat(plan_id: int) -> list[dict]:
    return _c.get_plan_tasks_flat(plan_id)


def get_last_n_plans(user_id: int, n: int = 30) -> list[dict]:
    return _c.get_last_n_plans(user_id, n)


def mark_tasks_completed(task_ids: list[int]) -> None:
    _c.mark_tasks_completed(task_ids)


def update_task_modification(task_id: int, modification_state: str, duration_mins: int | None = None) -> None:
    _c.update_task_modification(task_id, modification_state, duration_mins)
