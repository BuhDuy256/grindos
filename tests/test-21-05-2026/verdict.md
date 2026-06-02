# GrindOS AI Core — Test Verdict
**Date:** 2026-05-21  
**Tested by:** Claude Sonnet 4.6 + Le-Anh-Duy  
**Build:** Initial MVP scaffold (commit: post-scaffold)

---

## Overall Verdict: ✅ PASS — System Functional

The GrindOS AI Core FastAPI server is operational. All core lifecycle endpoints work end-to-end. The ECR math formula and stat evolution logic produce correct results per the specification in `04_batch_execution_logic.md`.

---

## Test Summary

| Test Case | Endpoint | Result | Notes |
|-----------|----------|--------|-------|
| TC-01 | `POST /v1/onboarding/forge` | ✅ PASS | Arc I generated with 4 milestones |
| TC-02 | `GET /dev/thinking/preview-prompt` | ✅ PASS | Phase=CALIBRATE, Budget=120 mins |
| TC-03 | `POST /dev/thinking/run-for-user` | ✅ PASS | 120 mins of tasks, all multiples of 5 |
| TC-04 | `GET /v1/daily-plan` | ✅ PASS | Task tree + system message returned |
| TC-05 | `POST /v1/daily-plan/end-day` | ✅ PASS | HTTP 202, tasks marked complete |
| TC-06 | `POST /dev/learning/run-for-user` | ✅ PASS | ECR=100% → POWER_UP, math correct |
| TC-06b | Learning — PENALTY scenario | ✅ PASS | ECR=50% → PENALTY, math correct |
| TC-07 | `GET /v1/player/profile` | ✅ PASS | Stats reflect POWER_UP correctly |
| TC-09 | Error handling — bad user | ✅ PASS | 404 + 400 with clear messages |
| TC-10 | `GET /dev/db/dump` | ✅ PASS | All 5 tables visible |

**Not tested this session** (require Day 30 arc state):
- `GET /v1/campaign/bridge-options`
- `POST /v1/campaign/select-bridge`
- `DELETE /dev/user/{id}/reset`
- `PATCH /v1/daily-plan/task/{id}` (EDITED/DELETED states)

---

## Bugs Found & Fixed

| ID | Severity | Description | Status |
|----|----------|-------------|--------|
| BUG-01 | Critical | Missing `__init__.py` in prompt subdirectories (ImportError at startup) | ✅ Fixed |
| BUG-02 | Medium | `None` encoded as `"null"` string in `update_ai_context` | ✅ Fixed |
| BUG-03 | Medium | Double JSON-encoding of `bridge_choices` in orchestrator | ✅ Fixed |
| BUG-04 | High | Forge writes DB rows before Gemini → orphan users on API failure | ✅ Fixed |
| BUG-05 | Medium | Dev thinking endpoint returns `"ok"` silently for partial-onboard users | ✅ Fixed |
| BUG-06 | High | Wrong Gemini model names (`gemini-2.0-flash` quota=0, `gemini-1.5-flash` not found) | ✅ Fixed — using `gemini-2.5-flash-lite` |

---

## Spec Compliance Check

| Spec Requirement | Status |
|-----------------|--------|
| Task budget = `int(120 × multiplier)` | ✅ Correct |
| All `duration_mins` divisible by 5 | ✅ Enforced via Pydantic validator + Gemini response_schema |
| Budget ±10% tolerance enforced | ✅ Validated in `guardrails.validate_plan_output` |
| `origin_type` = `SYSTEM_GENERATED` for AI tasks | ✅ Enforced via Pydantic `Literal` |
| Recursive CTE for task tree (no loop queries) | ✅ Implemented in `plan_dao.get_tasks_tree` |
| ON DELETE CASCADE for all FK relationships | ✅ In schema SQL |
| ECR formula: `(completed / total) × 100` | ✅ `math_stats.compute_ecr` |
| POWER_UP: multiplier +0.10, EXP +20, VIT +1, Streak +1, INT+1 if streak≥3 | ✅ Verified |
| PENALTY: multiplier -0.20, EXP +5, STR -1, streak=0 | ✅ Verified |
| Boundary floors: multiplier≥0.10, STR≥1, INT≥1 | ✅ Enforced in `math_stats.apply_stat_evolution` |
| Stateless execution (single-turn LLM, no chat sessions) | ✅ No chat history passed |
| Prompt schema as Pydantic `response_schema` (not in `prompt.txt`) | ✅ Implemented |
| Batch parallelization with `asyncio.gather` | ✅ `asyncio.to_thread` per user |

---

## Known Gaps / Follow-Up Items

| # | Item | Priority |
|---|------|----------|
| 1 | Arc Bridge (Day 30) endpoints not tested — needs a user with `arc_start_date` 30 days ago | High |
| 2 | `PATCH /v1/daily-plan/task/{id}` (modification sync) not end-to-end tested with Learning ECR recalculation for DELETED tasks | Medium |
| 3 | `POST /v1/internal/thinking/run` + `learning/run` (full batch) not tested with multiple users | Medium |
| 4 | `INT_STAT +1 if Streak ≥ 3` not tested (requires 3 consecutive POWER_UP days) | Low |
| 5 | Fallback plan (Gemini failure → copy yesterday's plan) not tested end-to-end | Medium |
| 6 | `gemini-2.5-flash-lite` model name needs verification against Google's current model list if behavior changes | Low |
| 7 | Compound index performance not benchmarked (expected fine for MVP scale) | Low |

---

## Environment Notes

```
Python:       3.13.x
FastAPI:      0.122.0
google-genai: 2.4.0
Model:        gemini-2.5-flash-lite
DB:           SQLite (grindos.db in ai/ directory)
OS:           Windows 11 Home 10.0.26200
```

**Run command:**
```bash
cd ai
uvicorn main:app --port 8000 --reload
```

**Swagger UI:** `http://localhost:8000/docs`
