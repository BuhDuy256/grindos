# Web Architecture

## Overview

```
System
├── Browser
│
├── Next.js (Web)                        ← this document
│   ├── app/         routes & pages
│   ├── features/    domain logic per feature
│   ├── shared/      UI primitives & utilities
│   ├── lib/         DB, auth (infrastructure)
│   └── middleware   auth guards, redirects
│   │
│   └── Request flow: Route → Action → Service → DB
│
└── AI Backend
    └── prompts · inference · pipelines
```

---

## System Overview

The application has three parts:

- **Web** — Next.js app that serves both the frontend UI and the backend API
- **AI Backend** — separate service handling AI features (prompts, inference, pipelines)

This document covers the **Web** layer only.

---

## Folder Structure

```
web/
├── app/              # Next.js routes (pages + API routes)
├── features/         # Domain logic, one folder per feature
├── shared/           # Reusable UI components and utilities
├── lib/              # App-wide infrastructure (DB, auth)
├── middleware.ts     # Edge middleware (auth guards, redirects)
└── types/            # Global TypeScript declarations
```

### `app/`

Next.js App Router. Contains only routing concerns — layout, page entry points, and API route handlers. No business logic lives here.

```
app/
├── layout.tsx
├── page.tsx
└── [route-name]/
    └── page.tsx
```

### `features/`

The heart of the application. Each feature is self-contained:

```
features/
└── [feature-name]/
    ├── components/       # UI components scoped to this feature
    ├── [feature].actions.ts   # Server Actions (mutations, form handlers)
    ├── [feature].service.ts   # Business logic, DB queries
    ├── [feature].types.ts     # Types local to this feature
    └── [feature].validator.ts # Input validation (Zod or similar)
```

Feature code should not import from other features. Cross-feature needs belong in `shared/` or `lib/`.

### `shared/`

Generic, reusable building blocks with no domain knowledge.

- `components/` — design system primitives (Button, Input, Modal, etc.)
- `utils/` — stateless helpers (e.g., `cn` for class merging)

If a component knows about a feature, it doesn't belong here.

### `lib/`

Infrastructure singletons used across the app:

- `database.ts` — DB client/connection
- `auth.ts` — auth session helpers

Keep this thin. Business logic goes in `features/`, not here.

---

## Layering Model

```
Route (app/) → Action (features/*.actions) → Service (features/*.service) → DB (lib/)
```

- **Routes** handle HTTP concerns only (params, response shape)
- **Actions** are the entry point for mutations; validate input, call services
- **Services** own business logic and data access
- **lib/** provides shared infrastructure; no business logic

---

## Design Principles

**Feature-first organization.** Code is grouped by domain, not by type. Everything related to a feature lives in one place.

**Keep routes thin.** Pages and API handlers should do no real work — delegate immediately to actions or services.

**No cross-feature imports.** Features are isolated. Shared logic is extracted to `shared/` or `lib/`.

**Validate at the boundary.** Input validation happens in `.actions.ts` or `.validator.ts`, before it reaches service logic.

**Colocate types.** Feature-specific types live in `[feature].types.ts`. Only truly global types go in `types/global.d.ts`.

---

## Conventions

| Concern | Where it lives |
|---|---|
| Page or API route | `app/` |
| Server Action (form, mutation) | `features/[name].actions.ts` |
| Business logic / DB query | `features/[name].service.ts` |
| Shared UI primitive | `shared/components/` |
| DB or auth client | `lib/` |
| Global type | `types/global.d.ts` |

---

## Boundaries with AI Backend

The Web layer communicates with the AI backend over HTTP. AI-specific logic (prompt construction, model calls) must not live in the web layer. The web layer sends requests and consumes responses — it does not own AI behavior.
