# GrindOS AI Core — Test Cases
**Date:** 2026-05-21  
**Environment:** localhost:8000, APP_ENV=development, Model: gemini-2.5-flash-lite

---

## TC-01: Player Onboarding (Forge)
**Endpoint:** `POST /v1/onboarding/forge`  
**Spec ref:** `05_api_endpoints_contract.md §2.1`

**Input:**
```json
{
  "username": "GrindPlayer",
  "timezone": "Asia/Ho_Chi_Minh",
  "main_goal": "Learn Golang Backend Development to secure a job within 6 months"
}
```

**Expected:**
- HTTP 200
- `status = "success"`
- `active_arc.arc_id = 1`
- `active_arc.milestones` contains exactly 4 entries (week 1–4)
- Row created in `users`, `player_stats` (defaults: level=1, exp=0, all stats=10, multiplier=1.00), `ai_contexts`
- `ai_contexts.metadata.current_arc.arc_start_date` = today's date
- No orphan rows if Gemini call fails (Gemini must be called before DB writes)

---

## TC-02: Thinking Pipeline — Prompt Preview (Dev)
**Endpoint:** `GET /dev/thinking/preview-prompt?user_id=1`  
**Spec ref:** Developer Mode specification

**Expected:**
- HTTP 200
- `arc_day_index = 1` (first day of arc)
- `phase = "CALIBRATE"` (Days 1–5 per `04_batch_execution_logic.md §2.A`)
- `task_budget = 120` (`int(120 × 1.00)` per `04_batch_execution_logic.md §2.B`)
- `rendered_prompt` contains placeholders filled with real values (no `{var}` literals visible)

---

## TC-03: Thinking Pipeline — 4 AM Batch (Dev Trigger)
**Endpoint:** `POST /dev/thinking/run-for-user`  
**Spec ref:** `04_batch_execution_logic.md §2`, `03_prompt_service_contract.md`

**Input:** `{"user_id": 1}`

**Expected:**
- HTTP 200, `status = "ok"`
- Row created in `daily_plans` for today's date
- Rows created in `tasks`:
  - All `origin_type = "SYSTEM_GENERATED"`
  - All `duration_mins` divisible by 5
  - Sum of `duration_mins` within ±10% of 120 (108–132 mins)
- If Gemini fails: 3-pass JSON repair attempted, then yesterday's plan fallback used
- Idempotent: calling twice does not create a second plan for the same date

---

## TC-04: Daily Plan Fetch
**Endpoint:** `GET /v1/daily-plan?user_id=1&date=<today>`  
**Spec ref:** `05_api_endpoints_contract.md §2.2`

**Expected:**
- HTTP 200
- `system_message` — non-empty punitive terminal monologue
- `progress_analysis` — non-empty cold assessment
- `tasks[]` — each task has `id`, `parent_id` (null for top-level), `title`, `duration_mins`, `is_completed=false`, `origin_type`
- HTTP 404 when plan does not exist for given date

---

## TC-05: End-of-Day Check-In
**Endpoint:** `POST /v1/daily-plan/end-day`  
**Spec ref:** `05_api_endpoints_contract.md §2.3`

**Input:**
```json
{
  "user_id": 1,
  "date": "<today>",
  "user_note": "Crushed every task. Go basics locked in.",
  "completed_task_ids": [<all task IDs>]
}
```

**Expected:**
- HTTP 202
- `status = "accepted"`
- Tasks referenced in `completed_task_ids` have `is_completed = 1` in DB
- `daily_plans.user_note` updated in DB
- No Gemini call during this request

---

## TC-06: Learning Pipeline — ECR Math (Dev Trigger)
**Endpoint:** `POST /dev/learning/run-for-user`  
**Spec ref:** `04_batch_execution_logic.md §3.A`

**Scenario A — POWER_UP (all tasks completed, ECR = 100%):**
- Input: `{"user_id": 1}`
- Expected ECR = 100% (sum_completed = sum_total)
- Expected event = "POWER_UP"
- Expected stat changes:
  - `difficulty_multiplier` = 1.00 + 0.10 = **1.10**
  - `exp` = 0 + 20 = **20**
  - `vit_stat` = 10 + 1 = **11**
  - `streak` = 0 + 1 = **1**
  - `int_stat` unchanged (streak < 3): **10**
  - `str_stat` unchanged: **10**

**Scenario B — PENALTY (partial completion, ECR < 65%):**
- Complete only tasks summing to < 65% of budget
- Expected event = "PENALTY"
- Expected: `multiplier -= 0.20`, `exp += 5`, `str_stat -= 1`, `streak = 0`

**Boundary checks (per spec):**
- `difficulty_multiplier` floor = 0.10
- `str_stat` floor = 1
- `int_stat` floor = 1

---

## TC-07: Player Profile
**Endpoint:** `GET /v1/player/profile?user_id=1`  
**Spec ref:** `05_api_endpoints_contract.md §2.4`

**Expected:**
- HTTP 200
- Response contains all 7 stat fields: `level`, `exp`, `str_stat`, `int_stat`, `vit_stat`, `streak`, `difficulty_multiplier`
- Values reflect the latest stat evolution applied by the Learning pipeline

---

## TC-08: Task Modification Sync (PATCH)
**Endpoint:** `PATCH /v1/daily-plan/task/{task_id}`  
**Spec ref:** Plan amendment (Web BE → AI Core sync)

**Input:**
```json
{ "modification_state": "EDITED", "duration_mins": 45 }
```

**Expected:**
- HTTP 200
- `tasks.modification_state = "EDITED"` and `tasks.duration_mins = 45` in DB
- ECR calculation during Learning pipeline excludes `DELETED` tasks from denominator

---

## TC-09: Error — Unonboarded User Dev Pipeline
**Endpoint:** `POST /dev/thinking/run-for-user`  
**Input:** `{"user_id": 999}` (non-existent user)

**Expected:** HTTP 404  

**Endpoint:** `POST /dev/thinking/run-for-user`  
**Input:** user who has `users` + `player_stats` but no `ai_contexts` (partial onboard)

**Expected:** HTTP 400 with descriptive error (not silent `"ok"`)

---

## TC-10: DB Dump Sanity (Dev)
**Endpoint:** `GET /dev/db/dump`

**Expected:**
- HTTP 200
- All 5 table keys present: `users`, `player_stats`, `ai_contexts`, `daily_plans`, `tasks`
- `db_path` points to `grindos.db` inside the `ai/` directory
