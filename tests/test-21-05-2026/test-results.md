# GrindOS AI Core — Test Results
**Date:** 2026-05-21  
**Run:** Final clean run (fresh DB, no orphan data)  
**Model used:** `gemini-2.5-flash-lite`  
**Server:** `uvicorn main:app --port 8000`

---

## Bugs Found & Fixed During Testing

### BUG-01: Missing `__init__.py` in prompt subdirectories
**Severity:** Critical (ImportError at startup)  
**Symptom:** `from ai_core_service.thinking.prompts.daily_task.service import ...` would fail without `__init__.py` in `prompts/` and `prompts/daily_task/` directories.  
**Fix:** Added 4 `__init__.py` files:
- `thinking/prompts/__init__.py`
- `thinking/prompts/daily_task/__init__.py`
- `learning/prompts/__init__.py`
- `learning/prompts/arc_bridge/__init__.py`

### BUG-02: `None` value double-encoded as `"null"` string in `update_ai_context`
**Severity:** Medium (wrong DB value for `bridge_choices` column on arc selection)  
**Symptom:** `user_dao.update_ai_context(user_id, bridge_choices=None)` would write the string `"null"` to the DB column instead of SQL `NULL`.  
**Root cause:** The condition `json.dumps(v) if k in ("metadata", "bridge_choices") and not isinstance(v, str)` was True for `None` since `None` is not a `str`.  
**Fix:** Added `if v is None: cols[k] = None` as first branch in the loop.

### BUG-03: Double JSON encoding of `bridge_choices` in orchestrator
**Severity:** Medium (JSON parse error when fetching bridge options)  
**Symptom:** `update_ai_context(..., bridge_choices=json.dumps([...]))` pre-encoded the list to a string, then `update_ai_context` encoded it again, storing a double-escaped JSON string.  
**Fix:** Pass the raw list — `bridge_choices=[c.model_dump() for c in ...]` — and let `update_ai_context` handle serialization.

### BUG-04: Forge endpoint creates orphan rows on Gemini failure
**Severity:** High (data integrity)  
**Symptom:** During initial testing, `gemini-2.0-flash` returned 429 quota errors. The forge endpoint had already created `users` and `player_stats` rows before the Gemini call failed, leaving users without `ai_contexts`. These orphan users caused silent failures in the thinking pipeline (which found no `ai_context` and returned `"ok"` without doing anything).  
**Fix:** Moved DB writes (`create_user`, `create_player_stats`) to **after** the Gemini call succeeds. If Gemini fails, no DB rows are written.

### BUG-05: Dev endpoint silently returns `"ok"` for partially-onboarded users
**Severity:** Medium (misleading response during development)  
**Symptom:** Calling `POST /dev/thinking/run-for-user` for a user without `ai_contexts` returned `{"status": "ok"}` even though nothing was executed.  
**Fix:** Added explicit guard: `if not get_player_stats(...) or not get_ai_context(...): raise HTTPException(400, ...)`.

### BUG-06: Wrong Gemini model names
**Severity:** High (broke all LLM calls)  
**Symptom 1:** `gemini-2.0-flash` → HTTP 429 `RESOURCE_EXHAUSTED` (free-tier daily quota = 0 for this key).  
**Symptom 2:** `gemini-1.5-flash` → HTTP 404 `NOT_FOUND` (model not available via v1beta API path in `google-genai` SDK v2).  
**Fix:** Changed model to `gemini-2.5-flash-lite` in `.env` and updated all in-code default fallbacks.

---

## Test Execution Results

### TC-01: Player Onboarding (Forge)
**Status: ✅ PASS**

**Actual response:**
```json
{
  "status": "success",
  "message": "Campaign forged successfully.",
  "active_arc": {
    "arc_id": 1,
    "arc_name": "Arc I: The Foundation of Go",
    "milestones": [
      { "week_number": 1, "objective": "Complete introductory Go programming tutorials, focusing on syntax, data types, and control structures. Set up a local Go development environment." },
      { "week_number": 2, "objective": "Understand Go's concurrency primitives (goroutines, channels) and basic package management. Build a simple command-line application." },
      { "week_number": 3, "objective": "Learn fundamental backend concepts: HTTP basics, RESTful API design principles. Start building a basic web server using Go's net/http package." },
      { "week_number": 4, "objective": "Integrate a simple database (e.g., SQLite or PostgreSQL with database/sql) with the Go web server. Implement basic CRUD operations for a single resource." }
    ]
  }
}
```

**Checks:**
- [x] HTTP 200
- [x] `status = "success"`
- [x] Arc I generated with 4 milestones
- [x] DB: user, player_stats, ai_contexts rows created correctly
- [x] Gemini failure leaves no orphan rows (after BUG-04 fix)

---

### TC-02: Thinking Pipeline — Prompt Preview
**Status: ✅ PASS**

**Actual response:**
```
Phase: CALIBRATE | Arc Day: 1 | Budget: 120 mins
```

**Checks:**
- [x] `arc_day_index = 1`
- [x] `phase = "CALIBRATE"` (correct for Days 1–5)
- [x] `task_budget = 120` (`int(120 × 1.00)` = 120)
- [x] `rendered_prompt` contains no unfilled `{placeholder}` literals

---

### TC-03: Thinking Pipeline — 4 AM Batch
**Status: ✅ PASS**

**Actual tasks generated:**
```
[10m] Set up Go environment
[70m] Complete 'A Tour of Go' - Basics and Flow Control sections
[40m] Practice Go syntax: Declare variables, basic types, and simple loops
```
**Total: 120 mins**

**Checks:**
- [x] HTTP 200, `status = "ok"`
- [x] 3 tasks created in DB
- [x] All `origin_type = "SYSTEM_GENERATED"`
- [x] All `duration_mins` divisible by 5: 10 ✓, 70 ✓, 40 ✓
- [x] Total = 120 mins (within ±10% of 120-min budget)
- [x] System message generated (punitive terminal style)

---

### TC-04: Daily Plan Fetch
**Status: ✅ PASS**

**Actual `system_message`:**
> "Your pathetic Level 1 stats mock your current predicament. Fail to conquer this..."

**Checks:**
- [x] HTTP 200
- [x] `system_message` non-empty, RPG punitive tone
- [x] `progress_analysis` non-empty
- [x] Tasks returned with all required fields
- [x] HTTP 404 on non-existent date (verified in earlier test attempt)

---

### TC-05: End-of-Day Check-In
**Status: ✅ PASS**

**Actual response:**
```json
{ "status": "accepted", "message": "Logs recorded. The System will evaluate your performance at midnight." }
```

**Checks:**
- [x] HTTP 202
- [x] `status = "accepted"`
- [x] Tasks marked `is_completed = 1` in DB (confirmed via DB dump after direct Python test)
- [x] `user_note` written to `daily_plans`
- [x] No Gemini call during request

---

### TC-06: Learning Pipeline — ECR Math (POWER_UP scenario)
**Status: ✅ PASS**

**Scenario:** All tasks completed (10 + 70 + 40 = 120 mins out of 120 total)

**Actual response:**
```json
{ "status": "ok", "result": { "status": "ok", "ecr": 100, "event": "POWER_UP" } }
```

**Stat evolution — Expected vs Actual:**
| Stat | Before | Formula | Expected | Actual |
|------|--------|---------|----------|--------|
| `difficulty_multiplier` | 1.00 | +0.10 | 1.10 | **1.10** ✅ |
| `exp` | 0 | +20 | 20 | **20** ✅ |
| `vit_stat` | 10 | +1 | 11 | **11** ✅ |
| `streak` | 0 | +1 | 1 | **1** ✅ |
| `int_stat` | 10 | +1 if streak≥3 | 10 (streak=1) | **10** ✅ |
| `str_stat` | 10 | unchanged | 10 | **10** ✅ |

**Boundary checks:** N/A (all stats above floors)

---

### TC-06b: Learning Pipeline — ECR Math (PENALTY scenario)
**Status: ✅ PASS** *(verified in earlier partial test run)*

**Scenario:** Tasks 1+2+3 completed (10+20+30=60 out of 120 total) → ECR = 50%

**Actual response:**
```json
{ "ecr": 50, "event": "PENALTY" }
```

**Stat evolution:**
| Stat | Before | Formula | Expected | Actual |
|------|--------|---------|----------|--------|
| `difficulty_multiplier` | 1.00 | -0.20 | 0.80 | **0.80** ✅ |
| `exp` | 0 | +5 | 5 | **5** ✅ |
| `str_stat` | 10 | -1 | 9 | **9** ✅ |
| `streak` | 0 | =0 | 0 | **0** ✅ |

---

### TC-07: Player Profile
**Status: ✅ PASS**

**Actual response (after POWER_UP):**
```json
{
  "user_id": 1,
  "stats": {
    "level": 1,
    "exp": 20,
    "str_stat": 10,
    "int_stat": 10,
    "vit_stat": 11,
    "streak": 1,
    "difficulty_multiplier": 1.1
  }
}
```

**Checks:**
- [x] HTTP 200
- [x] All 7 stat fields present
- [x] Values match expected POWER_UP evolution

---

### TC-09: Error — Unonboarded User
**Status: ✅ PASS** *(after BUG-05 fix)*

- `user_id=999` → HTTP 404 ✅
- Partially-onboarded user (no `ai_contexts`) → HTTP 400 with message ✅ (instead of silent `"ok"`)

---

### TC-10: DB Dump
**Status: ✅ PASS**

- HTTP 200 ✅
- All 5 tables present ✅
- `db_path` = `D:\Coding\side-project\GrindOS-MVP\grindos\ai\grindos.db` ✅
