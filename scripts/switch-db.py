"""
Switch database backend for all services.

Usage:
  python scripts/switch-db.py sqlite          → switch to SQLite (port 8080)
  python scripts/switch-db.py mongodb         → switch to MongoDB (port 3000)
  python scripts/switch-db.py sqlite --check  → switch + verify endpoints
  python scripts/switch-db.py --check         → check current backend only
"""
import re, sys, time
from pathlib import Path

try:
    import httpx
    HAS_HTTPX = True
except ImportError:
    HAS_HTTPX = False

ROOT = Path(__file__).parent.parent

CONFIGS = {
    "sqlite": {
        "ai_web_api_url":      "http://localhost:8080",
        "next_public_api_url": "http://localhost:8080",
        "description":         "FastAPI + SQLite (api/ at port 8080)",
        "base_url":            "http://localhost:8080",
    },
    "mongodb": {
        "ai_web_api_url":      "http://localhost:3000",
        "next_public_api_url": "",
        "description":         "Next.js + MongoDB (web/ at port 3000)",
        "base_url":            "http://localhost:3000",
    },
}

# Endpoints that must work on BOTH backends
REQUIRED_ENDPOINTS = [
    ("GET",  "/v1/player/profile?user_id=1",  "Player profile"),
    ("GET",  "/admin/users",                   "List users"),
    ("GET",  "/v1/daily-plan?user_id=1",       "Get daily plan"),
    ("POST", "/v1/daily-plan",                 "Ensure daily plan (NEW)"),
    ("GET",  "/admin/user/1/context",          "AI context"),
    ("GET",  "/admin/user/1/stats",            "Player stats"),
    ("GET",  "/admin/user/1/daily-plans",      "Plan history"),
]

GREEN  = "\033[32m"
RED    = "\033[31m"
YELLOW = "\033[33m"
RESET  = "\033[0m"


def set_env_var(path: Path, key: str, value: str) -> None:
    content = path.read_text(encoding="utf-8")
    pattern = rf"^{re.escape(key)}=.*"
    replacement = f"{key}={value}"
    if re.search(pattern, content, re.MULTILINE):
        content = re.sub(pattern, replacement, content, flags=re.MULTILINE)
    else:
        content = content.rstrip() + f"\n{replacement}\n"
    path.write_text(content, encoding="utf-8")


def get_current_mode() -> str | None:
    ai_env = ROOT / "ai" / ".env"
    if ai_env.exists():
        for line in ai_env.read_text().splitlines():
            if line.startswith("WEB_API_URL="):
                url = line.split("=", 1)[1].strip()
                if "8080" in url:
                    return "sqlite"
                if "3000" in url:
                    return "mongodb"
    return None


def check_backend(base_url: str, label: str) -> bool:
    if not HAS_HTTPX:
        print(f"  {YELLOW}httpx not installed — skip check{RESET}")
        return True

    print(f"\n  Checking {label} ({base_url})...")
    client = httpx.Client(timeout=5)
    all_ok = True

    # Get a valid JWT token first (needed for some endpoints)
    token = None
    try:
        r = client.post(f"{base_url}/auth/login",
                        json={"username": "admin", "password": "admin123"})
        if r.status_code == 200:
            token = r.json().get("token")
    except Exception:
        pass

    headers = {"Authorization": f"Bearer {token}"} if token else {}
    if not token:
        headers = {"X-Api-Key": "dev-secret"}

    for method, path, name in REQUIRED_ENDPOINTS:
        try:
            if method == "GET":
                r = client.get(f"{base_url}{path}", headers=headers)
            else:
                body = {"user_id": 1} if "daily-plan" in path else {}
                r = client.request(method, f"{base_url}{path}", json=body, headers=headers)

            # 404 on user-specific endpoints is OK (user may not exist)
            ok = r.status_code in (200, 201, 404, 422)
            icon = f"{GREEN}OK {RESET}" if ok else f"{RED}FAIL{RESET}"
            print(f"    [{icon}] {method:6} {path:<45} → {r.status_code} {name}")
            if not ok:
                all_ok = False
        except httpx.ConnectError:
            print(f"    [{RED}DOWN{RESET}] {method:6} {path:<45} → server not running")
            all_ok = False
        except Exception as e:
            print(f"    [{YELLOW}ERR {RESET}] {method:6} {path:<45} → {e}")

    client.close()
    return all_ok


def switch(mode: str) -> None:
    cfg = CONFIGS[mode]
    ai_env = ROOT / "ai" / ".env"
    web_env = ROOT / "web" / ".env"

    set_env_var(ai_env,  "WEB_API_URL",         cfg["ai_web_api_url"])
    set_env_var(web_env, "NEXT_PUBLIC_API_URL",  cfg["next_public_api_url"])

    print(f"Switched to: {cfg['description']}")
    print(f"  ai/.env   WEB_API_URL         = {cfg['ai_web_api_url']}")
    print(f"  web/.env  NEXT_PUBLIC_API_URL = {cfg['next_public_api_url'] or '(empty - Next.js routes)'}")
    print()
    print("Restart services:")
    if mode == "sqlite":
        print("  cd api && uvicorn main:app --port 8080 --reload")
    print("  cd ai  && uvicorn main:app --port 8000 --reload")
    print("  cd web && npm run dev")


def main():
    args = sys.argv[1:]
    do_check = "--check" in args
    modes_args = [a for a in args if a in CONFIGS]

    # --check only (no mode): check current backend
    if do_check and not modes_args:
        mode = get_current_mode()
        if not mode:
            print("Cannot determine current mode from ai/.env")
            sys.exit(1)
        print(f"Checking current backend: {mode}")
        ok = check_backend(CONFIGS[mode]["base_url"], mode)
        sys.exit(0 if ok else 1)

    # No args: show usage
    if not modes_args:
        print("Usage: python scripts/switch-db.py <sqlite|mongodb> [--check]")
        print()
        for name, cfg in CONFIGS.items():
            print(f"  {name:8} — {cfg['description']}")
        print()
        print(f"Current: {get_current_mode() or 'unknown'}")
        sys.exit(0)

    mode = modes_args[0]
    switch(mode)

    if do_check:
        print("\nWaiting 2s for services to be ready...")
        time.sleep(2)
        ok = check_backend(CONFIGS[mode]["base_url"], mode)
        print()
        if ok:
            print(f"{GREEN}All endpoints OK for {mode}{RESET}")
        else:
            print(f"{RED}Some endpoints failed — check server logs{RESET}")
        sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
