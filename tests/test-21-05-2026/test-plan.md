# GrindOS AI Core — Implementation & Test Plan
**Date:** 2026-05-21  
**Sprint:** AI Core MVP — Initial Scaffold  
**Tester:** Claude Sonnet 4.6 (assisted by Le-Anh-Duy)

---

## Context

The `ai/` folder was an empty placeholder. The goal was to implement the full GrindOS AI Core as a FastAPI microservice from the 5 architecture specification documents in `docs/architecture/ai-core/`.

The system is a **Stateless Prompt Pipeline Engine**: Python handles all math/stats deterministically; Gemini is called only for text generation (once per user per day in Thinking and Learning modes).

---

## Approved Implementation Plan (Summary)

### Stack
| Layer | Technology |
|-------|-----------|
| Web framework | FastAPI + Uvicorn |
| Database (MVP) | SQLite via stdlib `sqlite3` |
| AI provider | Google Gemini via `google-genai` SDK |
| Model | `gemini-2.5-flash-lite` (free tier) |
| Config | `python-dotenv`, env var `GEMINI_API` |

### File Tree Built
```
ai/
├── main.py                                      # FastAPI app entry + lifespan DB/Gemini init
├── requirements.txt
├── .env-example
└── ai_core_service/
    ├── routing/
    │   ├── endpoints.py                         # 9 public + internal endpoints
    │   └── dev_endpoints.py                     # 5 dev-only endpoints (APP_ENV=development)
    ├── retrieving/
    │   ├── connection.py                        # SQLite schema init + Gemini client singleton
    │   ├── user_dao.py                          # users, player_stats, ai_contexts CRUD
    │   └── plan_dao.py                          # daily_plans, tasks CRUD (recursive CTE)
    ├── thinking/
    │   ├── engine.py                            # 4 AM batch pipeline
    │   ├── guardrails.py                        # Pydantic response_schema models
    │   └── prompts/daily_task/
    │       ├── prompt.txt                       # Pure .format() template, no JSON schema
    │       └── service.py                       # render_prompt_template + get_hydrated_prompt
    └── learning/
        ├── math_stats.py                        # ECR formula + POWER_UP/STABLE/PENALTY
        ├── orchestrator.py                      # 11:59 PM batch pipeline
        └── prompts/arc_bridge/
            ├── prompt.txt
            └── service.py                       # Arc Bridge Gemini call
```

### Phase Execution Order (per instruction.md)
1. **Phase 1** — DB & DAO (`connection.py`, `user_dao.py`, `plan_dao.py`)
2. **Phase 2** — Prompt Services (`guardrails.py`, `daily_task/`, `arc_bridge/`)
3. **Phase 3** — Core Pipelines (`math_stats.py`, `engine.py`, `orchestrator.py`)
4. **Phase 4** — Routing (`endpoints.py`, `dev_endpoints.py`, `main.py`)

### Key Design Decisions
- `arc_start_date` stored in `ai_contexts.metadata` JSON (not a separate column)
- `bridge_choices` stored in `ai_contexts.bridge_choices` (separate TEXT column)
- Batch parallelization: `asyncio.to_thread(run_*_for_user, uid)` + `asyncio.gather` per timezone cohort
- JSON schema for LLM output enforced via Pydantic `response_schema` (NOT embedded in `prompt.txt` to avoid `.format()` escape conflicts)
- Gemini called **after** DB pre-checks to avoid orphan rows on API failure
- Dev mode: `APP_ENV=development` loads `/dev/*` endpoints

---

## Pre-Test Checklist
- [x] All 26 Python files parse without syntax errors (`ast.parse`)
- [x] `requirements.txt` installed successfully (`google-genai==2.4.0`)
- [x] `.env` has valid `GEMINI_API` key + `APP_ENV=development`
- [x] Server starts with `uvicorn main:app --port 8000`
- [x] `GET /docs` returns HTTP 200
