"""
GrindOS end-to-end test script.
Tests the full user flow against SQLite and/or MongoDB backends.

Prerequisites:
  - AI Core running with GEMINI_MOCK=true  (cd ai && GEMINI_MOCK=true uvicorn main:app --port 8000)
  - SQLite backend: cd api && uvicorn main:app --port 8080
  - MongoDB backend: cd web && npm run dev

Usage:
  python scripts/test-flow.py              # test both backends
  python scripts/test-flow.py sqlite       # test SQLite only
  python scripts/test-flow.py mongodb      # test MongoDB only
  python scripts/test-flow.py sqlite --keep  # don't cleanup after test
"""

import sys
import json
import time
import uuid
from datetime import date

# Force UTF-8 output on Windows
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

try:
    import httpx
except ImportError:
    print("httpx not found. Run: pip install httpx")
    sys.exit(1)

AI_CORE_URL = "http://localhost:8000"
TODAY = date.today().isoformat()

BACKENDS = {
    "sqlite":  "http://localhost:8080",
    "mongodb": "http://localhost:3000",
}

GREEN  = "\033[32m"
RED    = "\033[31m"
YELLOW = "\033[33m"
RESET  = "\033[0m"
BOLD   = "\033[1m"


class AssertError(Exception):
    pass


def step(label: str, res: httpx.Response, expect: int = 200) -> dict:
    ok = res.status_code == expect
    icon = f"{GREEN}PASS{RESET}" if ok else f"{RED}FAIL{RESET}"
    print(f"  [{icon}] [{res.status_code}] {label}")
    if not ok:
        try:
            detail = res.json()
        except Exception:
            detail = res.text[:200]
        raise AssertError(f"Expected {expect}, got {res.status_code}: {detail}")
    try:
        return res.json()
    except Exception:
        return {}


def assert_field(label: str, value, expected=None, truthy=False):
    if truthy and not value:
        raise AssertError(f"{label}: expected truthy, got {value!r}")
    if expected is not None and value != expected:
        raise AssertError(f"{label}: expected {expected!r}, got {value!r}")
    print(f"     {YELLOW}→{RESET} {label} = {value!r}")


# ── Core test flow ─────────────────────────────────────────────────────────────

def run_test(base: str, name: str, keep: bool = False) -> bool:
    print(f"\n{'='*58}")
    print(f"  {BOLD}Backend:{RESET} {name}  ({base})")
    print(f"  Date: {TODAY}")
    print(f"{'='*58}")

    suffix      = uuid.uuid4().hex[:6]
    username    = f"testuser_{suffix}"
    password    = "TestPass123!"
    token       = None   # regular user token
    admin_token = None   # admin token for /admin/* endpoints
    user_id     = None
    client      = httpx.Client(timeout=90)

    def H():
        return {"Authorization": f"Bearer {token}"} if token else {}

    def AH():
        """Admin headers — use admin token if available, else fall back to user token."""
        t = admin_token or token
        return {"Authorization": f"Bearer {t}"} if t else {}

    # Try to get admin token upfront (for /admin/* endpoints)
    try:
        r = client.post(f"{base}/auth/login",
                        json={"username": "admin", "password": "admin123"})
        if r.status_code == 200:
            admin_token = r.json().get("token")
    except Exception:
        pass

    try:
        # ── 1. Register ────────────────────────────────────────────────────
        print(f"\n  {BOLD}[1] Register{RESET}")
        d = step("POST /auth/register", client.post(f"{base}/auth/register",
            json={"username": username, "password": password}))
        token   = d["token"]
        user_id = d["user_id"]
        assert_field("user_id", user_id, truthy=True)
        assert_field("is_onboarded", d["is_onboarded"], expected=False)

        # ── 2. Login ───────────────────────────────────────────────────────
        print(f"\n  {BOLD}[2] Login{RESET}")
        d = step("POST /auth/login", client.post(f"{base}/auth/login",
            json={"username": username, "password": password}))
        token = d["token"]
        assert_field("token issued", bool(token), expected=True)

        # ── 3. Forge arc ───────────────────────────────────────────────────
        print(f"\n  {BOLD}[3] Forge arc (Gemini mocked){RESET}")
        d = step("POST /v1/onboarding/forge", client.post(f"{base}/v1/onboarding/forge",
            json={
                "user_id": str(user_id),
                "main_goal": "Learn Python for backend development in 3 months",
                "user_context": "Beginner, 2h/day, career change motivation",
            },
            headers=H()))
        arc_name = d.get("active_arc", {}).get("arc_name", "")
        milestones = d.get("active_arc", {}).get("milestones", [])
        assert_field("arc_name", arc_name, truthy=True)
        assert_field("milestones count", len(milestones), expected=4)

        # ── 4. Verify onboarded ────────────────────────────────────────────
        print(f"\n  {BOLD}[4] Verify onboarded{RESET}")
        d = step("GET /auth/me", client.get(f"{base}/auth/me", headers=H()))
        assert_field("is_onboarded", d["is_onboarded"], expected=True)

        # ── 4.5 Edge: backend auto-creates plan on demand ─────────────────
        print(f"\n  {BOLD}[4.5] Edge: POST /v1/daily-plan creates empty plan{RESET}")
        # Before thinking, no plan exists
        r_no_plan = client.get(
            f"{base}/v1/daily-plan?user_id={user_id}&date={TODAY}", headers=H())
        assert_field("GET plan before POST = 404", r_no_plan.status_code, expected=404)

        # POST /v1/daily-plan creates empty plan (backend owns lifecycle)
        d_ep = step("POST /v1/daily-plan (ensure)", client.post(
            f"{base}/v1/daily-plan",
            json={"user_id": int(user_id) if str(user_id).isdigit() else user_id, "date": TODAY},
            headers=H()))
        plan_id_before = d_ep["id"]
        assert_field("empty plan created", plan_id_before, truthy=True)
        assert_field("no tasks yet", len(d_ep.get("tasks", [])), expected=0)

        # User can now create task on empty plan
        d_pre = step("POST /v1/daily-plan/task (before thinking)", client.post(
            f"{base}/v1/daily-plan/task",
            json={"plan_id": plan_id_before, "title": "Pre-AI task", "duration_mins": 20},
            headers=H()), expect=201)
        pre_task_id = d_pre["id"]
        assert_field("pre-AI task created", pre_task_id, truthy=True)

        # Nonexistent plan still returns 4xx
        r_bad = client.post(f"{base}/v1/daily-plan/task",
            json={"plan_id": "999999", "title": "Ghost", "duration_mins": 30}, headers=H())
        assert_field("bad plan_id = 4xx", r_bad.status_code >= 400, expected=True)

        # ── 5. Run Thinking ────────────────────────────────────────────────
        print(f"\n  {BOLD}[5] Run Thinking (Gemini mocked){RESET}")
        t0 = time.time()
        d = step("POST /admin/thinking/run", client.post(f"{base}/admin/thinking/run",
            json={"user_id": str(user_id), "date": TODAY},
            headers=AH()))
        elapsed = time.time() - t0
        assert_field("status", d.get("status") or d.get("result", {}).get("status"), expected="ok")
        print(f"     {YELLOW}→{RESET} elapsed = {elapsed:.1f}s")

        # ── 6. Get daily plan — verify AI tasks ────────────────────────────
        print(f"\n  {BOLD}[6] Get daily plan{RESET}")
        d = step("GET /v1/daily-plan", client.get(
            f"{base}/v1/daily-plan?user_id={user_id}&date={TODAY}", headers=H()))
        tasks     = d.get("tasks", [])
        ai_tasks  = [t for t in tasks if t.get("origin_type") == "SYSTEM_GENERATED"]
        plan_id   = d.get("id")
        assert_field("total tasks", len(tasks), truthy=True)
        assert_field("AI tasks (SYSTEM_GENERATED)", len(ai_tasks), truthy=True)
        assert_field("plan_id", plan_id, truthy=True)
        first_task = tasks[0]
        print(f"     {YELLOW}→{RESET} first task: '{first_task['title']}' ({first_task['duration_mins']}min)")

        # ── 6a. Create user task manually ─────────────────────────────────
        print(f"\n  {BOLD}[6a] Create user task manually{RESET}")
        d = step("POST /v1/daily-plan/task", client.post(f"{base}/v1/daily-plan/task",
            json={"plan_id": plan_id, "title": "My manual task", "duration_mins": 25},
            headers=H()), expect=201)
        user_task_id = d["id"]
        assert_field("origin_type", d.get("origin_type", "USER_CREATED"), expected="USER_CREATED")
        print(f"     {YELLOW}→{RESET} user_task_id = {user_task_id}")

        # ── 6b. Create subtask ─────────────────────────────────────────────
        print(f"\n  {BOLD}[6b] Create subtask under AI task{RESET}")
        d = step("POST /v1/daily-plan/task (subtask)", client.post(f"{base}/v1/daily-plan/task",
            json={"plan_id": plan_id, "parent_id": first_task["id"],
                  "title": "Subtask of AI task", "duration_mins": 20},
            headers=H()), expect=201)
        subtask_id = d["id"]
        assert_field("parent_id", d.get("parent_id"), expected=first_task["id"])
        print(f"     {YELLOW}→{RESET} subtask_id = {subtask_id}, parent = {first_task['id']}")

        # ── 6c. Update task title + duration ──────────────────────────────
        print(f"\n  {BOLD}[6c] Update user task{RESET}")
        step("PATCH /v1/daily-plan/task/{id}", client.patch(
            f"{base}/v1/daily-plan/task/{user_task_id}",
            json={"title": "My updated task", "duration_mins": 30},
            headers=H()))
        d = step("GET plan — verify update", client.get(
            f"{base}/v1/daily-plan?user_id={user_id}&date={TODAY}", headers=H()))
        updated = next((t for t in d["tasks"] if t["id"] == user_task_id), None)
        assert_field("updated title", updated["title"] if updated else None,
                     expected="My updated task")
        assert_field("modification_state", updated["modification_state"] if updated else None,
                     expected="EDITED")

        # ── 6d. Soft-delete user task ─────────────────────────────────────
        print(f"\n  {BOLD}[6d] Delete user task (soft delete){RESET}")
        step("DELETE /v1/daily-plan/task/{id}", client.delete(
            f"{base}/v1/daily-plan/task/{user_task_id}", headers=H()))
        d = step("GET plan — verify task hidden", client.get(
            f"{base}/v1/daily-plan?user_id={user_id}&date={TODAY}", headers=H()))
        deleted_visible = any(t["id"] == user_task_id for t in d["tasks"])
        assert_field("deleted task hidden", deleted_visible, expected=False)
        subtask_visible = any(t["id"] == subtask_id for t in d["tasks"])
        assert_field("subtask still visible", subtask_visible, expected=True)

        # ── 7. Complete first task ─────────────────────────────────────────
        print(f"\n  {BOLD}[7] Complete first task{RESET}")
        d = step("PATCH /task/complete", client.patch(
            f"{base}/v1/daily-plan/task/{first_task['id']}/complete", headers=H()))
        assert_field("is_completed", d["is_completed"], expected=True)

        # ── 8. Save end-of-day note ────────────────────────────────────────
        print(f"\n  {BOLD}[8] End-of-day note{RESET}")
        step("POST /v1/daily-plan/end-day", client.post(f"{base}/v1/daily-plan/end-day",
            json={"user_id": str(user_id), "date": TODAY,
                  "user_note": "Automated test run completed."},
            headers=H()))

        # ── 9. Run Learning ────────────────────────────────────────────────
        print(f"\n  {BOLD}[9] Run Learning{RESET}")
        d = step("POST /admin/learning/run", client.post(f"{base}/admin/learning/run",
            json={"user_id": str(user_id), "date": TODAY},
            headers=AH()))
        result = d.get("result") or d
        ecr    = result.get("ecr")
        event  = result.get("event")
        assert_field("ecr_score", ecr, truthy=True)
        assert_field("event (POWER_UP/STABLE/PENALTY)", event, truthy=True)

        # ── 10. Verify stats updated ───────────────────────────────────────
        print(f"\n  {BOLD}[10] Verify player stats{RESET}")
        d = step("GET /v1/player/profile", client.get(
            f"{base}/v1/player/profile?user_id={user_id}", headers=H()))
        assert_field("level", d.get("level"), truthy=True)
        assert_field("streak exists", d.get("streak") is not None, expected=True)

        print(f"\n  {GREEN}{BOLD}All 10 steps passed for {name}!{RESET}")
        return True

    except AssertError as e:
        print(f"\n  {RED}FAIL: {e}{RESET}")
        return False
    except httpx.ConnectError:
        print(f"\n  {YELLOW}SKIP: Cannot connect to {base} - is the server running?{RESET}")
        return False
    except Exception as e:
        print(f"\n  {RED}ERROR: {type(e).__name__}: {e}{RESET}")
        return False
    finally:
        if user_id and not keep:
            try:
                client.delete(f"{base}/admin/user/{user_id}/reset", headers=AH())
                print(f"  ↩ Cleaned up test user '{username}'")
            except Exception:
                print(f"  {YELLOW}⚠ Cleanup failed for user '{username}'{RESET}")
        client.close()


# ── Entry point ────────────────────────────────────────────────────────────────

def main():
    args   = sys.argv[1:]
    keep   = "--keep" in args
    modes  = [a for a in args if a in BACKENDS]
    if not modes:
        modes = list(BACKENDS.keys())

    print(f"\n{BOLD}GrindOS End-to-End Test{RESET}")
    print(f"  Targets : {', '.join(modes)}")
    print(f"  AI Core : {AI_CORE_URL}")
    print(f"  Date    : {TODAY}")
    print(f"  Note    : AI Core must be running with GEMINI_MOCK=true")

    # Quick ping AI Core
    try:
        r = httpx.get(f"{AI_CORE_URL}/docs", timeout=3)
        print(f"  AI Core : {GREEN}UP{RESET}")
    except httpx.ConnectError:
        print(f"\n{RED}✗ AI Core not reachable at {AI_CORE_URL}{RESET}")
        print("  Start with: cd ai && GEMINI_MOCK=true uvicorn main:app --port 8000 --reload")
        sys.exit(1)

    results = {}
    for mode in modes:
        results[mode] = run_test(BACKENDS[mode], mode, keep=keep)

    # Summary
    print(f"\n{'='*58}")
    print(f"  {BOLD}Summary{RESET}")
    all_pass = True
    for mode, ok in results.items():
        status = f"{GREEN}PASS{RESET}" if ok else f"{RED}FAIL{RESET}"
        print(f"    {mode:8}  {status}")
        if not ok:
            all_pass = False
    print()

    sys.exit(0 if all_pass else 1)


if __name__ == "__main__":
    main()
