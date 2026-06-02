import os
from typing import Optional

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from api_service.connection import get_db

admin_router = APIRouter(prefix="/admin")

AI_CORE_URL = os.getenv("AI_CORE_URL", "http://localhost:8000")


# ── Models ────────────────────────────────────────────────────────────────────

class PlayerStatsOut(BaseModel):
    user_id: int
    level: int
    exp: int
    str_stat: int
    int_stat: int
    vit_stat: int
    streak: int
    difficulty_multiplier: float


class RunPipelineBody(BaseModel):
    user_id: int
    date: Optional[str] = None


class OnboardBody(BaseModel):
    username: str
    timezone: str
    main_goal: str
    user_context: Optional[str] = None


# ── Player stats (reads DB directly) ─────────────────────────────────────────

class UserOut(BaseModel):
    id: int
    username: str
    timezone: str


@admin_router.get("/users", response_model=list[UserOut])
def list_users():
    conn = get_db()
    rows = conn.execute("SELECT id, username, timezone FROM users ORDER BY id").fetchall()
    conn.close()
    return [UserOut(**dict(r)) for r in rows]


@admin_router.get("/player/profile", response_model=PlayerStatsOut)
def get_player_profile(user_id: int):
    conn = get_db()
    row = conn.execute(
        "SELECT user_id, level, exp, str_stat, int_stat, vit_stat, streak, difficulty_multiplier "
        "FROM player_stats WHERE user_id = ?",
        (user_id,),
    ).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    return PlayerStatsOut(**dict(row))


# ── Pipeline proxies (forward to AI Core) ────────────────────────────────────

def _proxy(method: str, path: str, body: dict | None = None):
    try:
        resp = httpx.request(
            method,
            f"{AI_CORE_URL}{path}",
            json=body,
            timeout=120,
        )
        return resp.json()
    except httpx.ConnectError:
        raise HTTPException(status_code=502, detail="AI Core unreachable — is it running on port 8000?")


@admin_router.post("/thinking/run")
def run_thinking(body: RunPipelineBody):
    return _proxy("POST", "/dev/thinking/run-for-user", body.model_dump(exclude_none=True))


@admin_router.post("/learning/run")
def run_learning(body: RunPipelineBody):
    return _proxy("POST", "/dev/learning/run-for-user", body.model_dump(exclude_none=True))


@admin_router.delete("/user/{user_id}/reset")
def reset_user(user_id: int):
    return _proxy("DELETE", f"/dev/user/{user_id}/reset")


@admin_router.post("/onboarding/forge")
def onboarding_forge(body: OnboardBody):
    return _proxy("POST", "/v1/onboarding/forge", body.model_dump())
