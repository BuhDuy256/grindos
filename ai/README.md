# GrindOS AI Core

FastAPI microservice that runs the two daily batch pipelines: **Thinking** (4:00 AM — generate tasks) and **Learning** (11:59 PM — calculate stats). Exposes a REST API consumed by the Web Backend.

> Architecture references: [`docs/architecture/ai-core/`](../docs/architecture/ai-core/)

---

## Requirements

- Python 3.9+
- A [Google AI Studio](https://aistudio.google.com) API key (Gemini)

---

## Setup

```bash
cd ai

# 1. Copy env template and fill in your key
cp .env-example .env

# 2. Install dependencies
pip install -r requirements.txt

# 3. Start the server
uvicorn main:app --port 8000 --reload
```

Open **`http://localhost:8000/docs`** — Swagger UI lists all endpoints.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API` | ✅ | Primary Gemini API key |
| `GEMINI_API_BACKUP` | optional | Backup key, auto-used on 429/503 rate-limit |
| `GEMINI_MODEL` | optional | Model name (default: `gemini-2.5-flash-lite`) |
| `APP_ENV` | optional | Set to `development` to enable `/dev/*` endpoints |

---

## API Endpoints

Full schema and JSON examples → [`05_api_endpoints_contract.md`](../docs/architecture/ai-core/05_api_endpoints_contract.md)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/v1/onboarding/forge` | Create user + generate Arc I via Gemini |
| GET | `/v1/daily-plan` | Fetch today's task list (reads from DB, no LLM latency) |
| POST | `/v1/daily-plan/end-day` | Submit completed tasks + user note → HTTP 202 |
| PATCH | `/v1/daily-plan/task/{id}` | Sync task edit/delete from Web BE |
| GET | `/v1/player/profile` | RPG stats dashboard |
| GET | `/v1/campaign/bridge-options` | Arc transition choices (Day 30 only) |
| POST | `/v1/campaign/select-bridge` | Lock chosen Arc II path |
| POST | `/v1/internal/thinking/run` | Trigger 4 AM batch (all users, called by scheduler) |
| POST | `/v1/internal/learning/run` | Trigger 11:59 PM batch (all users, called by scheduler) |

---

## Dev Mode Endpoints

Available only when `APP_ENV=development`. Bypass timezone scheduling so you can test the full lifecycle without waiting for 4 AM or 11:59 PM.

| Method | Path | Description |
|--------|------|-------------|
| POST | `/dev/thinking/run-for-user` | Run 4 AM pipeline for one user (pass `date` to simulate past days) |
| POST | `/dev/learning/run-for-user` | Run 11:59 PM pipeline for one user |
| GET | `/dev/thinking/preview-prompt` | Render hydrated prompt without calling Gemini |
| PUT | `/dev/user/{id}/set-arc-start` | Override arc start date for multi-day simulation |
| DELETE | `/dev/user/{id}/reset` | Reset user to Day 1 (wipe plans, stats) |
| GET | `/dev/db/dump` | Dump all SQLite tables as JSON |

### Dev lifecycle (single session):

```bash
# 1. Onboard a user
POST /v1/onboarding/forge

# 2. Inspect what Gemini will receive (no API call)
GET  /dev/thinking/preview-prompt?user_id=1

# 3. Generate today's tasks
POST /dev/thinking/run-for-user   {"user_id": 1}

# 4. Fetch the plan
GET  /v1/daily-plan?user_id=1&date=2026-05-21

# 5. Submit end-of-day
POST /v1/daily-plan/end-day       {"user_id": 1, "date": "...", "user_note": "...", "completed_task_ids": [...]}

# 6. Run learning pipeline (calculates ECR, updates stats)
POST /dev/learning/run-for-user   {"user_id": 1}

# 7. Check updated RPG stats
GET  /v1/player/profile?user_id=1

# Reset and repeat
DELETE /dev/user/1/reset
```

---

## Architecture

```
ai/
├── main.py                          # App entry point, DB + Gemini init
├── ai_core_service/
│   ├── retrieving/                  # DAO layer (SQLite)
│   │   ├── connection.py            # DB init, Gemini client + key failover
│   │   ├── user_dao.py              # users, player_stats, ai_contexts
│   │   └── plan_dao.py              # daily_plans, tasks (recursive CTE)
│   ├── thinking/                    # 4 AM pipeline
│   │   ├── engine.py                # Phase calc → prompt → Gemini → DB
│   │   ├── guardrails.py            # Pydantic response_schema models
│   │   └── prompts/daily_task/      # prompt.txt + service.py
│   ├── learning/                    # 11:59 PM pipeline
│   │   ├── math_stats.py            # ECR formula + POWER_UP/STABLE/PENALTY
│   │   ├── orchestrator.py          # Stats update + Arc Bridge trigger
│   │   └── prompts/arc_bridge/      # prompt.txt + service.py
│   └── routing/
│       ├── endpoints.py             # Public + internal endpoints
│       └── dev_endpoints.py         # Dev-only endpoints
```

**Key design rules** → [`01_architecture_overview.md`](../docs/architecture/ai-core/01_architecture_overview.md)
- Single-turn Gemini calls only — no chat sessions, no agent loops
- Python handles all math (ECR, stat evolution) — AI never modifies stats
- Batch parallelization via `asyncio.gather` + `asyncio.to_thread` per timezone cohort

**Database schema** → [`02_database_schema.md`](../docs/architecture/ai-core/02_database_schema.md)  
**Prompt contract** → [`03_prompt_service_contract.md`](../docs/architecture/ai-core/03_prompt_service_contract.md)  
**Batch logic & ECR math** → [`04_batch_execution_logic.md`](../docs/architecture/ai-core/04_batch_execution_logic.md)

---

## Database

SQLite file at `ai/grindos.db` — created automatically on first startup. For production, swap to PostgreSQL by updating `connection.py`.

The DB is gitignored. To inspect it during development:

```bash
GET /dev/db/dump
```
