from typing import Optional

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from api_service.auth import create_token, decode_token, hash_password, verify_password
from api_service.connection import get_db

auth_router = APIRouter(prefix="/auth", tags=["auth"])


class RegisterBody(BaseModel):
    username: str
    password: str


class LoginBody(BaseModel):
    username: str
    password: str


class AuthOut(BaseModel):
    token: str
    user_id: str  # string to match MongoDB response format
    username: str
    is_admin: bool
    is_onboarded: bool


@auth_router.post("/register", response_model=AuthOut)
def register(body: RegisterBody):
    if not body.username.strip() or not body.password:
        raise HTTPException(400, "username and password required")

    with get_db() as conn:
        existing = conn.execute(
            "SELECT id FROM users WHERE username = ?", (body.username.strip(),)
        ).fetchone()
        if existing:
            raise HTTPException(409, "Username already taken")

        cursor = conn.execute(
            "INSERT INTO users (username, timezone, password_hash, is_admin) VALUES (?, ?, ?, 0)",
            (body.username.strip(), "Asia/Ho_Chi_Minh", hash_password(body.password)),
        )
        user_id = cursor.lastrowid
        conn.execute("INSERT INTO player_stats (user_id) VALUES (?)", (user_id,))
        conn.commit()

    token = create_token(user_id, is_admin=False)
    return AuthOut(token=token, user_id=str(user_id), username=body.username.strip(),
                   is_admin=False, is_onboarded=False)


@auth_router.post("/login", response_model=AuthOut)
def login(body: LoginBody):
    with get_db() as conn:
        row = conn.execute(
            "SELECT id, username, password_hash, is_admin FROM users WHERE username = ?",
            (body.username.strip(),),
        ).fetchone()
        if not row or not verify_password(body.password, row["password_hash"] or ""):
            raise HTTPException(401, "Invalid username or password")
        is_onboarded = conn.execute(
            "SELECT 1 FROM ai_contexts WHERE user_id = ?", (row["id"],)
        ).fetchone() is not None

    token = create_token(row["id"], bool(row["is_admin"]))
    return AuthOut(token=token, user_id=str(row["id"]), username=row["username"],
                   is_admin=bool(row["is_admin"]), is_onboarded=is_onboarded)


@auth_router.post("/register-internal")
def register_internal(body: RegisterBody):
    """Create user without password — for AI Core use only."""
    with get_db() as conn:
        cursor = conn.execute(
            "INSERT INTO users (username, timezone) VALUES (?, ?)",
            (body.username.strip(), "Asia/Ho_Chi_Minh"),
        )
        user_id = cursor.lastrowid
        conn.execute("INSERT OR IGNORE INTO player_stats (user_id) VALUES (?)", (user_id,))
        conn.commit()
    return {"user_id": user_id}


@auth_router.get("/me", response_model=AuthOut)
def me(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Not authenticated")
    token = authorization.split(" ", 1)[1]
    try:
        payload = decode_token(token)
    except Exception:
        raise HTTPException(401, "Invalid or expired token")

    user_id = int(payload["sub"])
    with get_db() as conn:
        row = conn.execute(
            "SELECT id, username, is_admin FROM users WHERE id = ?", (user_id,)
        ).fetchone()
        if not row:
            raise HTTPException(401, "User not found")
        is_onboarded = conn.execute(
            "SELECT 1 FROM ai_contexts WHERE user_id = ?", (user_id,)
        ).fetchone() is not None

    return AuthOut(token=token, user_id=str(row["id"]), username=row["username"],
                   is_admin=bool(row["is_admin"]), is_onboarded=is_onboarded)
