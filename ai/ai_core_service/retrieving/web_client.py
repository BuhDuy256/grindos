"""
HTTP client for AI Core → Web API communication.
Switch backend by setting WEB_API_URL env var:
  - http://localhost:3000  → MongoDB (web/)
  - http://localhost:8080  → SQLite  (api/)
"""
import os
from typing import Any, Optional

import httpx

_BASE = os.getenv("WEB_API_URL", "http://localhost:3000").rstrip("/")
_SECRET = os.getenv("AI_CORE_SECRET", "dev-secret")
_TIMEOUT = 30


def _headers() -> dict:
    return {"X-Api-Key": _SECRET, "Content-Type": "application/json"}


def _get(path: str, params: dict | None = None) -> Any:
    r = httpx.get(f"{_BASE}{path}", params=params, headers=_headers(), timeout=_TIMEOUT)
    r.raise_for_status()
    return r.json()


def _post(path: str, body: dict | None = None) -> Any:
    r = httpx.post(f"{_BASE}{path}", json=body or {}, headers=_headers(), timeout=_TIMEOUT)
    r.raise_for_status()
    return r.json()


def _patch(path: str, body: dict | None = None) -> Any:
    r = httpx.patch(f"{_BASE}{path}", json=body or {}, headers=_headers(), timeout=_TIMEOUT)
    r.raise_for_status()
    return r.json()


def _delete(path: str) -> Any:
    r = httpx.delete(f"{_BASE}{path}", headers=_headers(), timeout=_TIMEOUT)
    r.raise_for_status()
    return r.json()


def _safe_get(path: str, params: dict | None = None) -> Optional[dict]:
    """GET that returns None on 404 instead of raising."""
    try:
        return _get(path, params)
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 404:
            return None
        raise


# ── user_dao interface ────────────────────────────────────────────────────────

def get_all_users() -> list[dict]:
    return _get("/admin/users")


def get_user(user_id: int) -> Optional[dict]:
    return _safe_get(f"/admin/user/{user_id}")


def create_user(username: str, timezone: str) -> int:
    return _post("/auth/register-internal", {"username": username, "timezone": timezone})["user_id"]


def create_player_stats(user_id: int) -> None:
    pass  # handled by register-internal


def get_player_stats(user_id: int) -> Optional[dict]:
    data = _safe_get(f"/admin/user/{user_id}/stats")
    if data is None:
        return None
    # normalize to snake_case (FastAPI returns snake_case, Next.js mapper also returns snake_case)
    return {
        "user_id": user_id,
        "level": data.get("level", 1),
        "exp": data.get("exp", 0),
        "str_stat": data.get("str_stat", 10),
        "int_stat": data.get("int_stat", 10),
        "vit_stat": data.get("vit_stat", 10),
        "streak": data.get("streak", 0),
        "difficulty_multiplier": data.get("difficulty_multiplier", 1.0),
    }


def update_player_stats(user_id: int, **fields) -> None:
    if fields:
        _patch(f"/admin/user/{user_id}/stats", fields)


def get_ai_context(user_id: int) -> Optional[dict]:
    data = _safe_get(f"/admin/user/{user_id}/context")
    if data is None:
        return None
    return {
        "main_goal": data.get("main_goal", ""),
        "user_persona_summary": data.get("user_persona_summary"),
        "metadata": data.get("metadata", {}),
        "bridge_choices": data.get("bridge_choices"),
    }


def create_ai_context(user_id: int, main_goal: str, metadata: dict) -> None:
    _post(f"/admin/user/{user_id}/context", {"main_goal": main_goal, "metadata": metadata})


def update_ai_context(user_id: int, **fields) -> None:
    if fields:
        _patch(f"/admin/user/{user_id}/context", fields)


# ── plan_dao interface ────────────────────────────────────────────────────────

def ensure_plan(user_id: int, date: str) -> dict:
    """GET or CREATE plan for given user+date. Backend owns plan lifecycle."""
    return _post("/v1/daily-plan", {"user_id": user_id, "date": date})


def add_tasks_to_plan(plan_id, tasks: list[dict]) -> None:
    """Bulk add AI-generated tasks to an existing plan."""
    plan_id_int = int(plan_id) if isinstance(plan_id, str) else plan_id
    _post(f"/admin/daily-plan/{plan_id_int}/tasks", {"tasks": tasks})


def get_daily_plan(user_id: int, date: str) -> Optional[dict]:
    return _safe_get("/admin/daily-plan", {"user_id": user_id, "date": date})


def update_daily_plan(plan_id, **fields) -> None:
    plan_id_int = int(plan_id) if isinstance(plan_id, str) else plan_id
    allowed = {"ecr_score", "user_note", "learning_summary", "ai_insight",
               "system_message", "progress_analysis"}
    body = {k: v for k, v in fields.items() if k in allowed}
    if body:
        _patch(f"/admin/daily-plan/{plan_id_int}", body)


def create_plan_with_tasks(
    user_id: int, date: str, system_message: str, progress_analysis: str, tasks: list[dict]
) -> int:
    return _post("/admin/daily-plan/with-tasks", {
        "user_id": user_id, "date": date,
        "system_message": system_message, "progress_analysis": progress_analysis,
        "tasks": tasks,
    })["plan_id"]


def get_tasks_tree(plan_id: int) -> list[dict]:
    return _get(f"/admin/daily-plan/{plan_id}/tasks", {"format": "tree"})


def get_plan_tasks_flat(plan_id: int) -> list[dict]:
    return _get(f"/admin/daily-plan/{plan_id}/tasks", {"format": "flat"})


def get_last_n_plans(user_id: int, n: int = 30) -> list[dict]:
    return _get(f"/admin/user/{user_id}/daily-plans", {"limit": n})


def mark_tasks_completed(task_ids: list[int]) -> None:
    if task_ids:
        _patch("/admin/tasks/mark-completed", {"task_ids": task_ids})


def update_task_modification(task_id: int, modification_state: str, duration_mins: int | None = None) -> None:
    body: dict = {"modification_state": modification_state}
    if duration_mins is not None:
        body["duration_mins"] = duration_mins
    _patch(f"/admin/task/{task_id}", body)


def bulk_create_tasks(plan_id: int, tasks: list[dict]) -> None:
    pass  # absorbed into create_plan_with_tasks
