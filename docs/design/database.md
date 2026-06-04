# Database Design & Architecture

The application uses **MongoDB** as its primary database. The database connection and queries are managed directly within the Next.js backend (API routes and modules) located in the `web` project.

## 🏗️ Architecture

The backend code is organized into **Modules** (`web/modules/`) which strictly separate the database layer (Repositories) from the business logic (Services) and the HTTP layer (API Routes).

### Directory Structure

```text
web/
├── app/v1/                   # API Routes (Next.js App Router API)
├── lib/
│   └── mongodb.ts            # MongoDB connection singleton & configuration
└── modules/                  # Backend Domain Modules
    ├── daily-plan/           # Daily plans & tasks logic
    ├── player-stats/         # Gamification stats logic
    ├── users/                # User & AI Context logic
    └── shared/               # Shared logic (e.g., auto-increment sequences)
```

Within each module (e.g., `web/modules/daily-plan/`), you will find:
- **`type.ts`**: TypeScript definitions for the MongoDB Documents (e.g., `TaskDocument`) and the API Data Transfer Objects (e.g., `TaskDTO`).
- **`mongo.repository.ts`**: Handles all direct MongoDB queries (find, insert, update, delete) and index creation for the collections in that module.
- **`service.ts`**: Contains the business logic. It calls the repository and is called by the API Routes.
- **`mapper.ts`**: Maps the raw database Document formats to the sanitized DTO formats returned to the client.

## 🗄️ Database Collections

The database uses the following main collections:

### 1. `users`
Stores user account information.
- **Key Fields**: `id` (Number), `username`, `timezone`, `passwordHash`, `isAdmin`.
- **Indexes**: Unique index on `id` and `username`.

### 2. `ai_contexts`
Stores the onboarding and personalization context for a user.
- **Key Fields**: `userId`, `mainGoal`, `userPersonaSummary`, `metadata`.

### 3. `player_stats`
Stores the gamification progression of the user.
- **Key Fields**: `userId`, `level`, `exp`, `strStat`, `intStat`, `vitStat`, `streak`, `difficultyMultiplier`.

### 4. `daily_plans`
Stores the high-level plan for a user for a specific date.
- **Key Fields**: `id`, `userId`, `date`, `progressAnalysis`, `systemMessage`, `ecrScore`, `userNote`, `learningSummary`, `aiInsight`.
- **Indexes**: Unique compound index on `{ userId: 1, date: 1 }`.

### 5. `tasks`
Stores individual tasks that belong to a daily plan. Supports hierarchical subtasks via `parentId`.
- **Key Fields**: `id`, `dailyPlanId`, `parentId`, `title`, `description`, `durationMins`, `isCompleted`, `originType`, `modificationState`.
- **Indexes**: Index on `dailyPlanId` for fast retrieval of a plan's tasks.

### 6. `counters`
A shared collection used to generate auto-incrementing numerical `id`s for other collections (like users, plans, and tasks). This avoids exposing raw MongoDB ObjectIds to the frontend and makes URLs cleaner.

## 📝 Design Patterns & Standards

1. **Auto-Incrementing IDs**: 
   While MongoDB natively uses `_id` (`ObjectId`), the system generates sequential numeric `id`s for entities using the `counters` collection (implemented in `web/modules/shared/sequence.mongo.repository.ts`).

2. **Audit Timestamps & Soft Deletes**:
   All core documents include standard audit fields:
   - `createdAt: Date`
   - `updatedAt: Date`
   - `deletedAt?: Date | null` (Used to soft-delete records instead of permanently removing them).

3. **Schema Versioning**:
   All documents include a `schemaVersion: 1` field to facilitate future database migrations if the document structure needs to evolve.

4. **DTO vs Document**:
   The API never returns the raw MongoDB document. Documents are passed through a `mapper` to convert them into a safe `DTO` (Data Transfer Object). For example, `TaskDocument` uses camelCase (e.g., `durationMins`) and includes hidden fields like `_id`, while `TaskDTO` uses snake_case (e.g., `duration_mins`) and strips sensitive data.

5. **Connection Pooling**:
   In `web/lib/mongodb.ts`, the `MongoClient` instance is cached globally (`globalThis.__grindosMongoClientPromise`) to prevent Next.js hot-reloading from creating too many connections during development, and to maintain an efficient connection pool in production.
