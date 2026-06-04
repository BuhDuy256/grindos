"""user_dao — HTTP wrapper. Same interface as before; backed by web_client."""
from typing import Optional
from . import web_client as _c


def get_all_users() -> list[dict]:
    return _c.get_all_users()


def get_user(user_id: int) -> Optional[dict]:
    return _c.get_user(user_id)


def create_user(username: str, timezone: str) -> int:
    return _c.create_user(username, timezone)


def create_player_stats(user_id: int) -> None:
    _c.create_player_stats(user_id)


def get_player_stats(user_id: int) -> Optional[dict]:
    return _c.get_player_stats(user_id)


def update_player_stats(user_id: int, **fields) -> None:
    _c.update_player_stats(user_id, **fields)


def get_ai_context(user_id: int) -> Optional[dict]:
    return _c.get_ai_context(user_id)


def create_ai_context(user_id: int, main_goal: str, metadata: dict) -> None:
    _c.create_ai_context(user_id, main_goal, metadata)


def update_ai_context(user_id: int, **fields) -> None:
    _c.update_ai_context(user_id, **fields)
