# Database Architecture

## Current State

GrindOS now has two database paths during the Mongo migration:

| Area | Runtime | Database | Notes |
|------|---------|----------|-------|
| `web/` | Next.js App Router API routes | MongoDB | User-facing API, auth, player stats, daily plan reads/mutations |
| `ai/` | FastAPI AI Core | SQLite `db/grindos.db` | Existing thinking/learning/onboarding pipeline storage |
| `api/` | Legacy FastAPI Web API | SQLite `db/grindos.db` | Kept as reference contract while `web/` mirrors its endpoints |

The active web backend is implemented in `web/app/api-like route handlers` using MongoDB native driver. The route contract still mirrors the old FastAPI paths:

```txt
/auth/register
/auth/login
/auth/me
/v1/daily-plan
/v1/daily-plan/task
/v1/daily-plan/task/:taskId
/v1/daily-plan/task/:taskId/complete
/v1/daily-plan/end-day
/v1/player/profile
/v1/player/ecr-history
/admin/users
/admin/player/profile
/admin/thinking/run
/admin/learning/run
/admin/user/:userId/reset
/admin/onboarding/forge
```

Admin pipeline triggers still proxy to `AI_CORE_URL`. Until AI Core is migrated to MongoDB, generated thinking/learning data must be synchronized into MongoDB or written by a Mongo-aware AI Core path before the web UI can read it.

## Environment

`web/` expects these variables:

```env
MONGODB_URI=mongodb://localhost:27017
JWT_SECRET=change-this-in-production
AI_CORE_URL=http://localhost:8000
```

`MONGODB_DB_NAME` is optional. If it is not set, `web/lib/mongodb.ts` uses the
database name embedded in `MONGODB_URI`; if the URI has no database path, it
falls back to `grindos`.

Database CRUD tests can use a separate URI, but it is optional:

```env
MONGODB_TEST_URI=
```

If `MONGODB_TEST_URI` is empty, the tests fall back to `MONGODB_URI`. The test suite still overrides `MONGODB_DB_NAME` with a temporary database named `go_<timestamp>_<random>` and drops that database after the run.

## Code Layout

MongoDB access is isolated to `mongo.repository.ts` files:

```txt
web/lib/mongodb.ts
web/modules/shared/sequence.mongo.repository.ts
web/modules/users/
  schema.ts
  type.ts
  mapper.ts
  repository.ts
  mongo.repository.ts
  service.ts
web/modules/player-stats/
  type.ts
  mapper.ts
  repository.ts
  mongo.repository.ts
  service.ts
web/modules/daily-plan/
  schema.ts
  type.ts
  mapper.ts
  repository.ts
  mongo.repository.ts
  service.ts
```

Rules:

- API routes parse request data, validate with Zod, call services, and return JSON.
- Services contain business decisions and call repository interfaces.
- Only `mongo.repository.ts` knows collection names or MongoDB query syntax.
- Mappers convert Mongo documents to DTOs.
- DTOs return `id` fields as strings and never expose Mongo `_id`.
- Documents that may evolve include `schemaVersion: 1`.
- Mutations update `updatedAt`; creates set both `createdAt` and `updatedAt`.
- Deletions that affect user data are soft deletes with `deletedAt`.

## Collections

### `counters`

Simple auto-increment counters for API-compatible numeric IDs.

```ts
{
  _id: "users" | "tasks" | string,
  value: number,
  schemaVersion: 1,
  createdAt: Date,
  updatedAt: Date
}
```

Used by:

- `nextSequence("users")`
- `nextSequence("tasks")`

### `users`

Stores login identity and admin flag.

```ts
{
  _id: ObjectId,
  id: number,
  username: string,
  timezone: string,
  passwordHash: string | null,
  isAdmin: boolean,
  schemaVersion: 1,
  createdAt: Date,
  updatedAt: Date,
  deletedAt: Date | null
}
```

Indexes:

| Index | Type | Reason |
|-------|------|--------|
| `{ id: 1 }` | unique | API-compatible lookup |
| `{ username: 1 }` | unique | register/login conflict check |

DTO:

```ts
{
  id: string,
  username: string,
  timezone: string
}
```

Auth DTO:

```ts
{
  token: string,
  user_id: string,
  username: string,
  is_admin: boolean,
  is_onboarded: boolean
}
```

### `ai_contexts`

Tracks onboarding state for the web backend.

```ts
{
  _id: ObjectId,
  userId: number,
  mainGoal: string,
  userPersonaSummary: string | null,
  metadata: Record<string, unknown>,
  bridgeChoices: unknown[] | null,
  schemaVersion: 1,
  createdAt: Date,
  updatedAt: Date
}
```

Indexes:

| Index | Type | Reason |
|-------|------|--------|
| `{ userId: 1 }` | unique | one context per user |

Current `metadata` shape:

```json
{
  "current_arc": {
    "arc_id": 1,
    "arc_name": "Arc I",
    "milestones": []
  },
  "campaign_history": []
}
```

### `player_stats`

Stores deterministic RPG stats used by profile and admin screens.

```ts
{
  _id: ObjectId,
  userId: number,
  level: number,
  exp: number,
  strStat: number,
  intStat: number,
  vitStat: number,
  streak: number,
  difficultyMultiplier: number,
  schemaVersion: 1,
  createdAt: Date,
  updatedAt: Date
}
```

Indexes:

| Index | Type | Reason |
|-------|------|--------|
| `{ userId: 1 }` | unique | one stat row per user |

DTO:

```ts
{
  user_id: string,
  level: number,
  exp: number,
  str_stat: number,
  int_stat: number,
  vit_stat: number,
  streak: number,
  difficulty_multiplier: number
}
```

### `daily_plans`

Stores daily plan headers.

```ts
{
  _id: ObjectId,
  id: number,
  userId: number,
  date: string,
  progressAnalysis: string | null,
  systemMessage: string | null,
  ecrScore: number | null,
  userNote: string | null,
  learningSummary: string | null,
  aiInsight: string | null,
  schemaVersion: 1,
  createdAt: Date,
  updatedAt: Date,
  deletedAt: Date | null
}
```

Indexes:

| Index | Type | Reason |
|-------|------|--------|
| `{ id: 1 }` | unique | API-compatible lookup |
| `{ userId: 1, date: 1 }` | unique | daily plan read path |
| `{ userId: 1, ecrScore: 1, date: -1 }` | normal | ECR history query |

DTO:

```ts
{
  id: string,
  date: string,
  system_message: string | null,
  progress_analysis: string | null,
  ecr_score: number | null,
  user_note: string | null,
  tasks: TaskDTO[]
}
```

### `tasks`

Stores root tasks and subtasks as separate documents.

```ts
{
  _id: ObjectId,
  id: number,
  dailyPlanId: number,
  parentId: number | null,
  title: string,
  description: string | null,
  durationMins: number,
  isCompleted: boolean,
  originType: "SYSTEM_GENERATED" | "USER_CREATED",
  modificationState: "UNCHANGED" | "EDITED" | "DELETED",
  schemaVersion: 1,
  createdAt: Date,
  updatedAt: Date,
  deletedAt: Date | null
}
```

Indexes:

| Index | Type | Reason |
|-------|------|--------|
| `{ id: 1 }` | unique | API-compatible lookup |
| `{ dailyPlanId: 1, parentId: 1 }` | normal | plan task list and tree build |

DTO:

```ts
{
  id: string,
  plan_id: string,
  parent_id: string | null,
  title: string,
  description: string | null,
  duration_mins: number,
  is_completed: boolean,
  modification_state: "UNCHANGED" | "EDITED" | "DELETED"
}
```

## CRUD Flows

### Register

```txt
POST /auth/register
route -> registerSchema -> registerUser -> UserRepository.create
                                -> PlayerStatsRepository.createDefault
                                -> mapAuthToDTO
```

Writes:

- `users`
- `player_stats`
- `counters`

### Login

```txt
POST /auth/login
route -> loginSchema -> loginUser -> UserRepository.findByUsername
                            -> UserRepository.hasAiContext
                            -> mapAuthToDTO
```

Reads:

- `users`
- `ai_contexts`

### Daily Plan Read

```txt
GET /v1/daily-plan?user_id=...&date=...
route -> getDailyPlanQuerySchema -> getDailyPlan
  -> DailyPlanRepository.findPlanByUserAndDate
  -> DailyPlanRepository.findTasksByPlanId
  -> mapDailyPlanToDTO
```

Reads:

- `daily_plans`
- `tasks`

### Task Create

```txt
POST /v1/daily-plan/task
route -> createTaskSchema -> createTask
  -> DailyPlanRepository.findPlanById
  -> DailyPlanRepository.findTaskById (if parent_id exists)
  -> DailyPlanRepository.createTask
  -> mapTaskToDTO
```

Writes:

- `tasks`
- `counters`

### Task Update

```txt
PATCH /v1/daily-plan/task/:taskId
route -> updateTaskSchema -> updateTask
  -> DailyPlanRepository.updateTask
```

Uses `$set`, not document replacement.

### Task Complete Toggle

```txt
PATCH /v1/daily-plan/task/:taskId/complete
route -> parse taskId -> toggleTaskComplete
  -> DailyPlanRepository.toggleTaskComplete
```

Uses `$set` for `isCompleted` and `updatedAt`.

### Task Delete

```txt
DELETE /v1/daily-plan/task/:taskId
route -> parse taskId -> deleteTask
  -> DailyPlanRepository.softDeleteTask
```

Soft delete fields:

```ts
{
  modificationState: "DELETED",
  deletedAt: Date,
  updatedAt: Date
}
```

### End Day Note

```txt
POST /v1/daily-plan/end-day
route -> endDaySchema -> saveEndDayNote
  -> DailyPlanRepository.updateUserNote
```

Writes only:

- `daily_plans.userNote`
- `daily_plans.updatedAt`

## Testing

Database CRUD tests live at:

```txt
web/tests/database-crud.test.ts
```

Run:

```bash
cd web
npm run test:db
```

The suite covers:

- `users`: create, duplicate username conflict, read by id, read by username, list
- `ai_contexts`: upsert and onboarding state check
- `player_stats`: create default, read, reset
- `daily_plans`: read by user/date, update user note, ECR history, reset soft delete
- `tasks`: create root/subtask, read, toggle completion, update, soft delete

If neither `MONGODB_TEST_URI` nor `MONGODB_URI` is set, Vitest marks the Mongo CRUD suite as skipped. When `MONGODB_URI` is used, the test still writes to a temporary database name rather than the app database.

## Migration Notes

There are no historical Mongo migrations yet because these collections are newly introduced in `web/`.

When changing existing Mongo document structure:

1. Add or update `schemaVersion`.
2. Add a migration under `web/src/migrations/` or `web/migrations/`.
3. Document affected collection, old fields, new fields, rollback, backup needs, and batch strategy.
4. Keep DTO compatibility where possible so frontend code does not depend on Mongo internals.

## Current Gap

AI Core still writes generated plans and learning results to SQLite. The Web Mongo backend can read and mutate Mongo documents, but generated AI data will not appear in the Web UI unless one of these is implemented:

| Option | What changes | When to use |
|--------|--------------|-------------|
| Migrate AI Core DAOs to MongoDB | AI writes directly to `daily_plans`, `tasks`, `player_stats`, `ai_contexts` in Mongo | Best long-term path |
| Add sync job SQLite -> MongoDB | Keep AI as-is, copy generated rows into Mongo after pipeline runs | Useful transitional path |
| Make Web admin proxy import AI response into Mongo | Admin trigger calls AI Core, then writes returned data to Mongo | Only if AI Core returns full generated payload |
