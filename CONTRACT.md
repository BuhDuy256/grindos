# GrindOS API Contract

Tất cả endpoints mà **AI Core** cần gọi. Cả `web/` (MongoDB) và `api/` (SQLite) phải implement đúng contract này.

Auth header cho AI Core: `X-Api-Key: {AI_CORE_SECRET}` (từ env var).

---

## Users

| Method | Path | Body / Params | Response |
|--------|------|--------------|----------|
| `GET` | `/admin/users` | — | `[{id, username, timezone}]` |
| `GET` | `/admin/user/{id}` | — | `{id, username, timezone, is_admin}` \| 404 |
| `POST` | `/auth/register-internal` | `{username, timezone}` | `{user_id}` |

## Player Stats

| Method | Path | Body / Params | Response |
|--------|------|--------------|----------|
| `GET` | `/admin/user/{id}/stats` | — | `{level, exp, str_stat, int_stat, vit_stat, streak, difficulty_multiplier}` \| 404 |
| `PATCH` | `/admin/user/{id}/stats` | `{level?, exp?, str_stat?, int_stat?, vit_stat?, streak?, difficulty_multiplier?}` | `{ok: true}` |

## AI Context (arc, milestones, persona)

| Method | Path | Body / Params | Response |
|--------|------|--------------|----------|
| `GET` | `/admin/user/{id}/context` | — | `{main_goal, user_persona_summary?, metadata, bridge_choices?}` \| 404 |
| `POST` | `/admin/user/{id}/context` | `{main_goal, metadata}` | `{ok: true}` |
| `PATCH` | `/admin/user/{id}/context` | `{main_goal?, user_persona_summary?, metadata?, bridge_choices?}` | `{ok: true}` |

**`metadata` shape:**
```json
{
  "current_arc": {
    "arc_id": 1,
    "arc_name": "Arc I: The Awakening",
    "arc_start_date": "2026-06-01",
    "milestones": [{"week_number": 1, "objective": "..."}]
  },
  "campaign_history": []
}
```

## Daily Plans

| Method | Path | Body / Params | Response |
|--------|------|--------------|----------|
| `POST` | `/v1/daily-plan` | `{user_id, date?}` | plan object — **get or create** (backend owns lifecycle) |
| `GET` | `/admin/daily-plan` | `?user_id=X&date=YYYY-MM-DD` | `{id, date, system_message?, progress_analysis?, ecr_score?, user_note?, learning_summary?}` \| 404 |
| `PATCH` | `/admin/daily-plan/{id}` | `{ecr_score?, user_note?, learning_summary?, ai_insight?, system_message?, progress_analysis?}` | `{ok: true}` |
| `GET` | `/admin/user/{id}/daily-plans` | `?limit=N` | `[{id, date, ecr_score?, user_note?, learning_summary?}]` |

> `POST /admin/daily-plan/with-tasks` — **deprecated**. AI Core now uses `POST /v1/daily-plan` (ensure) + `PATCH /admin/daily-plan/{id}` (metadata) + `POST /admin/daily-plan/{id}/tasks` (add tasks).

**Task object in POST body:**
```json
{
  "title": "string",
  "description": "string | null",
  "duration_mins": 30,
  "parent_id": null,
  "origin_type": "SYSTEM_GENERATED",
  "modification_state": "UNCHANGED"
}
```

## Tasks

| Method | Path | Body / Params | Response |
|--------|------|--------------|----------|
| `POST` | `/admin/daily-plan/{id}/tasks` | `{tasks[]}` | `{ok: true, count: N}` — **bulk add AI tasks to existing plan** |
| `GET` | `/admin/daily-plan/{id}/tasks` | `?format=tree\|flat` | `[{id, parent_id?, title, description?, duration_mins, is_completed, origin_type, modification_state, depth?}]` |
| `PATCH` | `/admin/task/{id}` | `{modification_state, duration_mins?}` | `{ok: true}` |
| `PATCH` | `/admin/tasks/mark-completed` | `{task_ids: [int]}` | `{ok: true}` |

---

## Existing Endpoints (already implemented in both backends)

These are already present and do NOT need to be added:

```
POST  /auth/login
POST  /auth/register
GET   /auth/me
POST  /v1/daily-plan     ← NEW: get or create plan (both backends)
GET   /v1/daily-plan
POST  /v1/daily-plan/task
PATCH /v1/daily-plan/task/{id}
PATCH /v1/daily-plan/task/{id}/complete
DELETE /v1/daily-plan/task/{id}
POST  /v1/daily-plan/end-day
GET   /v1/player/profile
GET   /v1/player/ecr-history
GET   /admin/player/profile
POST  /admin/thinking/run
POST  /admin/learning/run
DELETE /admin/user/{id}/reset
POST  /admin/onboarding/forge
```

---

## ID Type Convention

All user-facing endpoints (`/v1/*`, `/auth/*`) return IDs as **strings** for consistency with MongoDB.
Admin endpoints (`/admin/*`) used by AI Core return IDs as integers internally.

```
auth/login  → user_id: "4"   (string)
/v1/daily-plan → id: "42"    (string)  
/v1/daily-plan/task → id: "158" (string)
/admin/user/{id}/stats → user_id: 4 (int, AI Core internal)
```

---

## Switching Backends

AI Core reads `WEB_API_URL` env var:

```bash
WEB_API_URL=http://localhost:3000   # MongoDB production (web/)
WEB_API_URL=http://localhost:8080   # SQLite dev/test (api/)
```
