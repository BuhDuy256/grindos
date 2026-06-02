# Database Architecture

## Overview

GrindOS uses a single **shared SQLite database** (`db/grindos.db`) accessed directly by both backend services. Neither service calls the other's HTTP API to read data — each opens a direct connection to the same file.

```
ai/   (AI Core)  ──sqlite3──┐
                             ├──► db/grindos.db
api/  (Web API)  ──sqlite3──┘
```

This is an explicit MVP trade-off: shared file access is simpler than a sync layer, and SQLite's MVCC handles concurrent reads without locking. Production would migrate both services to a shared PostgreSQL instance.

---

## Service Data Ownership

Each service has clear write ownership per table. No service writes to another service's tables.

| Table | AI Core writes | Web API writes | Notes |
|-------|---------------|----------------|-------|
| `users` | ✅ (onboarding) | — | Created once at forge |
| `player_stats` | ✅ (learning pipeline) | — | Only math_stats.py touches this |
| `ai_contexts` | ✅ (onboarding, arc bridge) | — | Arc metadata, persona |
| `daily_plans` | ✅ (thinking pipeline) | ✅ `user_note` only | AI creates, user annotates |
| `tasks` | ✅ (thinking pipeline) | ✅ (tick, edit, delete, create) | Shared write |

---

## How AI Core Accesses Data

AI Core uses a **DAO (Data Access Object) layer** in `ai/ai_core_service/retrieving/`:

```
ai/ai_core_service/
└── retrieving/
    ├── connection.py   # sqlite3.connect(DB_PATH) — opens file directly
    ├── user_dao.py     # CRUD: users, player_stats, ai_contexts
    └── plan_dao.py     # CRUD: daily_plans, tasks (recursive CTE)
```

`connection.py` resolves the DB path:

```python
_default = Path(__file__).resolve().parent.parent.parent.parent / "db" / "grindos.db"
DB_PATH  = Path(os.getenv("DATABASE_URL", str(_default)))
```

The thinking and learning pipelines import DAOs directly — no HTTP involved:

```python
# engine.py (thinking pipeline)
from ai_core_service.retrieving import plan_dao, user_dao

stats = user_dao.get_player_stats(user_id)   # SELECT FROM player_stats
ctx   = user_dao.get_ai_context(user_id)     # SELECT FROM ai_contexts
plan_dao.create_plan_with_tasks(...)          # INSERT INTO daily_plans + tasks
```

## How Web API Accesses Data

Web API has its own identical connection module in `api/api_service/connection.py`, pointing to the same file:

```python
_default = Path(__file__).resolve().parent.parent.parent / "db" / "grindos.db"
DB_PATH  = Path(os.getenv("DATABASE_URL", str(_default)))
```

Web API reads `daily_plans` and `tasks` directly for serving the frontend. It does **not** call AI Core's HTTP endpoints to fetch plan data — it queries SQLite itself.

Web API **does** call AI Core over HTTP only to **trigger pipelines** (thinking, learning) — never to read stored data.

---

## Schema

See [AI Core — Database Schema](ai-core/02_database_schema.md) for the full table definitions.

**Current tables:**

| Table | Purpose |
|-------|---------|
| `users` | Identity — username, timezone |
| `player_stats` | RPG stats — level, exp, STR, INT, VIT, streak, multiplier |
| `ai_contexts` | Long-term AI memory — main goal, arc metadata (JSON), persona summary |
| `daily_plans` | Daily execution header — date, system message, ECR score, user note |
| `tasks` | Task tree — title, description, duration, completion, modification state |

---

## Query Rules

**Recursive CTE for task trees** — never loop-query:

```sql
WITH RECURSIVE task_tree AS (
    SELECT id, parent_id, title, description, duration_mins, is_completed, ...
    FROM tasks WHERE daily_plan_id = ? AND parent_id IS NULL
    UNION ALL
    SELECT t.* FROM tasks t
    INNER JOIN task_tree tt ON t.parent_id = tt.id
)
SELECT * FROM task_tree ORDER BY depth, id
```

**Always scope by `user_id`** — prevents cross-user data leaks in multi-user queries.

**Compound indexes** on hot read paths:
- `(daily_plans.user_id, daily_plans.date)`
- `(tasks.daily_plan_id, tasks.parent_id)`

---

## Migration Strategy

SQLite schema changes use `ALTER TABLE ... ADD COLUMN` inside `init_db()`, guarded by a PRAGMA check:

```python
existing = [r[1] for r in conn.execute("PRAGMA table_info(tasks)").fetchall()]
if "description" not in existing:
    conn.execute("ALTER TABLE tasks ADD COLUMN description TEXT")
```

This is non-destructive — existing rows get `NULL` for the new column. Run on every startup; idempotent.
