# Documentation: 02_database_schema.md
# Project: GrindOS Core AI Engine (MVP Version)

## 1. Database Architecture Strategy
GrindOS utilizes a Relational Database model (PostgreSQL for production / SQLite for local MVP testing). The schema combines strict relational constraints (Foreign Keys, Cascading Deletes) for traditional To-Do List operations with flexible `JSONB` (or `TEXT` in SQLite) columns to store dynamic, evolving AI context without overcomplicating the table structure.

---

## 2. Entity Relationship Diagram (Conceptual Layout)

```

┌───────────────┐          ┌──────────────────┐
│     users     │ ◄───────►│   player_stats   │ (1:1 Relationship)
└───────┬───────┘          └──────────────────┘
        │
        ├─────────────────┐
        ▼                 ▼
┌───────────────┐  ┌───────────────┐
│  ai_contexts  │  │  daily_plans  │ (1:N Relationships)
└───────────────┘  └───────┬───────┘
                           │
                           ▼
                    ┌───────────────┐
                    │     tasks     │ ◄──┐ (Self-referencing 1:N)
                    └───────────────┘ ───┘

```

---

## 3. Data Dictionary & Table Definitions

### Table 1: `users`
Defines the core tenant/user identity.
* `id`: `UUID` (Primary Key) or `INTEGER` Auto-increment (SQLite).
* `username`: `VARCHAR(255)` (Not Null).
* `timezone`: `VARCHAR(100)` (Not Null) — *Crucial for scheduling the 4:00 AM and 11:59 PM cron jobs relative to the user's local time.*

### Table 2: `player_stats`
Stores deterministic RPG tracking metrics. Manually overwritten by `learning/math_stats.py`.
* `user_id`: `UUID` / `INTEGER` (Foreign Key referencing `users.id`, Unique constraint for 1:1 relation, On Delete Cascade).
* `level`: `INTEGER` (Default: 1).
* `exp`: `INTEGER` (Default: 0).
* `str_stat`: `INTEGER` (Default: 10).
* `int_stat`: `INTEGER` (Default: 10).
* `vit_stat`: `INTEGER` (Default: 10).
* `streak`: `INTEGER` (Default: 0) — *Current consecutive days of hitting ECR target.*
* `difficulty_multiplier`: `NUMERIC(3,2)` (Default: 1.00) — *Scales task duration boundaries.*

### Table 3: `ai_contexts`
Acts as the central long-term memory asset for the AI Core.
* `user_id`: `UUID` / `INTEGER` (Foreign Key referencing `users.id`, Unique, On Delete Cascade).
* `main_goal`: `TEXT` (Not Null) — *The macro objective declared during onboarding.*
* `user_persona_summary`: `TEXT` (Nullable) — *Psychological assessment updated periodically by the AI.*
* `metadata`: `JSONB` (PostgreSQL) / `TEXT` (SQLite JSON string) — *CRUCIAL: Encapsulates the dynamic World Map and Active Arc Plan. Follows the strict nested schema:*
    ```json
    {
      "current_arc": {
        "arc_id": 1,
        "arc_name": "string",
        "phase_order": 1,
        "milestones": [
          { "week_number": 1, "objective": "string" }
        ]
      },
      "campaign_history": []
    }
    ```

### Table 4: `daily_plans`
Stores the daily historical execution headers. Bridge between Thinking and Learning.
* `id`: `UUID` (Primary Key) or `INTEGER` Auto-increment.
* `user_id`: `UUID` / `INTEGER` (Foreign Key referencing `users.id`, On Delete Cascade).
* `date`: `DATE` (Not Null).
* `progress_analysis`: `TEXT` (Nullable) — *AI-generated reflection text derived from yesterday's execution.*
* `system_message`: `TEXT` (Nullable) — *The highly punitive/toxic RPG terminal monologue shown to the user.*
* `ecr_score`: `INTEGER` (Nullable, Range 0-100) — *Calculated at 11:59 PM by Python code.*
* `user_note`: `TEXT` (Nullable) — *The qualitative end-day confession log input by the user.*

### Table 5: `tasks`
The unified task execution grid. This table handles both top-level parent tasks and infinite nested child subtasks via a self-referencing tree model.
* `id`: `UUID` (Primary Key) or `INTEGER` Auto-increment.
* `daily_plan_id`: `UUID` / `INTEGER` (Foreign Key referencing `daily_plans.id`, On Delete Cascade).
* `parent_id`: `UUID` / `INTEGER` (Nullable, Foreign Key referencing `tasks.id`, On Delete Cascade) — *If NULL, this is a core task. If populated, it indicates a subtask. Ràng buộc `ON DELETE CASCADE` đảm bảo việc xóa một task cha sẽ lập tức triệt tiêu toàn bộ nhánh con đệ quy trong Database.*
* `title`: `VARCHAR(500)` (Not Null).
* `duration_mins`: `INTEGER` (Not Null, must be multiples of 5).
* `is_completed`: `BOOLEAN` (Default: FALSE).
* `origin_type`: `VARCHAR(50)` (Not Null) — *Enforced Values: `SYSTEM_GENERATED`, `USER_ADDED`.*
* `modification_state`: `VARCHAR(50)` (Default: `UNCHANGED`) — *Enforced Values: `UNCHANGED`, `EDITED`, `DELETED`.*

---

## 4. Integrity and Query Rules for Copilot
When implementing the Data Access Object (DAO) layer inside `retrieving/`, Copilot must enforce these rules:
1.  **Index Enforcement:** Compound indexes must be placed on (`daily_plans.user_id`, `daily_plans.date`) and (`tasks.daily_plan_id`, `tasks.parent_id`) to accelerate batch reads during the morning execution.
2.  **No For-Loop Queries:** To reconstruct the hierarchical task/subtask tree, Copilot must use a single **Recursive Common Table Expression (CTE)** query rather than querying individual IDs inside a loop.
3.  **Strict Isolation:** Multi-tenant operations inside transaction blocks must scope queries tightly using the `user_id` context to prevent cross-user leakages.
