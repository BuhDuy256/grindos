# Web Architecture

## Overview

```
Browser / Mobile App
        │
        ▼
┌─────────────────┐        ┌─────────────────┐        ┌─────────────────┐
│   Next.js (FE)  │ ──────▶│   Go/Gin (API)  │ ──────▶│ FastAPI (AI Core│
│   web/          │  HTTP  │   api/          │  HTTP  │   ai/           │
│   React + UI    │        │   REST API      │        │   Gemini + DB   │
└─────────────────┘        └─────────────────┘        └─────────────────┘
                                    │
                                    ▼
                               PostgreSQL
                             (production DB)
```

- **Next.js** (`web/`) — Frontend only: React pages, UI components. Calls Go API over HTTP.
- **Go/Gin** (`api/`) — Web Backend: auth, business logic, REST API shared by web and mobile.
- **FastAPI** (`ai/`) — AI Core: Gemini pipelines, batch jobs. Internal service, not exposed publicly.

---

## Folder Structure

### `web/` — Next.js Frontend

```
web/
├── app/              # Routes and pages (React Server + Client Components)
├── features/         # UI logic per domain feature
│   └── [feature]/
│       ├── components/        # Feature-scoped UI
│       ├── [feature].hooks.ts # Client-side state/data fetching
│       └── [feature].types.ts # Types local to this feature
├── shared/           # Reusable UI primitives (no domain knowledge)
│   ├── components/   # Button, Input, Modal, etc.
│   └── utils/        # Stateless helpers (cn, formatDate, etc.)
├── lib/
│   └── api-client.ts # Typed HTTP client pointing to Go API
├── middleware.ts      # Auth guards, redirects (reads JWT from cookie)
└── types/            # Global TypeScript declarations
```

Next.js has **no database access and no business logic**. All mutations go through the Go API. `lib/` contains only the HTTP client, not a DB connection.

Request flow (web):
```
Page / Component → api-client.ts → Go API → response → render
```

### `api/` — Go Web Backend

```
api/
├── cmd/
│   └── server/
│       └── main.go          # Entry point, wires router + middleware
├── internal/
│   ├── handler/             # HTTP handlers — thin, delegate to service
│   ├── service/             # Business logic
│   ├── repository/          # DB access (SQL queries)
│   ├── middleware/          # JWT auth, logging, rate limiting
│   └── client/              # HTTP client for calling AI Core (FastAPI)
├── pkg/
│   └── dto/                 # Request/response structs (shared shapes)
├── go.mod
├── go.sum
└── .env
```

Request flow (Go API):
```
Handler → Middleware (auth) → Service → Repository → DB
                                      └→ client/ → AI Core (FastAPI)
```

---

## Service Boundaries

| Concern | Lives in |
|---|---|
| React pages, UI components | `web/` (Next.js) |
| Auth (JWT issue + verify) | `api/` (Go) |
| User data, daily plan, stats | `api/` (Go) → PostgreSQL |
| AI task generation, ECR calc | `ai/` (FastAPI) |
| Gemini calls, batch pipelines | `ai/` (FastAPI) |
| Mobile API | same `api/` (Go) endpoints |

---

## Auth Flow

```
1. User logs in → POST /api/v1/auth/login (Go)
2. Go issues a signed JWT → stored in httpOnly cookie (web) or returned as token (mobile)
3. Every subsequent request → Go middleware verifies JWT
4. Next.js middleware reads cookie → redirects to /login if missing
```

AI Core does not have its own auth. It only accepts calls from the Go backend (internal network / same host).

---

## Communication Rules

- **Next.js → Go API:** all calls go through `lib/api-client.ts`. No direct DB access from Next.js.
- **Go API → AI Core:** Go calls FastAPI over HTTP via `internal/client/`. AI Core is never called directly from the frontend.
- **Mobile → Go API:** same endpoints as web. No separate mobile backend.
- **AI Core → DB:** FastAPI reads/writes the same PostgreSQL database as Go. Each service owns its own tables (no cross-service table writes).

---

## Design Principles

**Frontend is display only.** Next.js renders UI and calls the Go API. It owns no business logic and has no DB connection.

**Go API is the single entry point.** Both web and mobile clients hit the same Go endpoints. Auth, validation, and business rules live here.

**AI Core is internal.** FastAPI is not exposed to the internet. Only the Go backend calls it. This means AI-specific concerns (prompt engineering, Gemini errors, batch retries) never leak into the frontend or mobile.

**Validate at the boundary.** Input validation happens in Go handlers/middleware before reaching service logic. Frontend sends raw user input; Go enforces correctness.

**Each service owns its schema.** Go owns user-facing tables (users, sessions, preferences). AI Core owns AI-specific tables (daily_plans, tasks, ai_contexts, player_stats). No service writes to another service's tables directly.
