# GrindOS

Gamified productivity system — complete daily tasks, earn RPG stats, progress through 30-day arcs powered by AI.

---

## Architecture

```
Browser / Mobile
      │
      ▼
web/  (Next.js)   ──HTTP──▶   api/  (FastAPI)   ──HTTP──▶   ai/  (FastAPI)
Frontend UI                   REST API                        AI Core + Gemini
                                   │
                                   ▼
                              db/grindos.db  (SQLite, shared)
```

| Service | Stack | Port | Purpose |
|---------|-------|------|---------|
| `ai/` | Python / FastAPI | 8000 | Gemini pipelines, batch jobs, RPG stat engine |
| `api/` | Python / FastAPI | 8080 | REST API for web + mobile, reads shared DB |
| `web/` | Next.js / React | 3000 | Frontend UI |

---

## Prerequisites

- Python 3.9+
- Node.js 18+
- A [Google AI Studio](https://aistudio.google.com) API key (Gemini)

---

## Setup

### 1. AI Core

```bash
cd ai

# Copy env and fill in your Gemini API key
cp .env-example .env

# Install dependencies
pip install -r requirements.txt

# Start server (creates db/grindos.db on first run)
uvicorn main:app --port 8000 --reload
```

### 2. Web API

```bash
cd api

# Copy env
cp .env.example .env

# Install dependencies
pip install -r requirements.txt

# Start server
uvicorn main:app --port 8080 --reload
```

### 3. Web (Next.js)

```bash
cd web

# Copy env
cp .env.example .env

# Install dependencies
npm install

# Start dev server
npm run dev
```

---

## Running the Full Stack

Open **3 terminals** from the project root:

```bash
# Terminal 1 — AI Core
cd ai && uvicorn main:app --port 8000 --reload

# Terminal 2 — Web API
cd api && uvicorn main:app --port 8080 --reload

# Terminal 3 — Frontend
cd web && npm run dev
```

| URL | Description |
|-----|-------------|
| http://localhost:3000 | Web frontend |
| http://localhost:3000/onboarding | Create a new user |
| http://localhost:3000/daily-plan | Today's task list |
| http://localhost:3000/admin | Dev admin panel |
| http://localhost:8080/docs | Web API — Swagger UI |
| http://localhost:8000/docs | AI Core — Swagger UI |

---

## First-Time Workflow

**1. Onboard a user** — open `localhost:3000/onboarding`:
- Enter username and main goal
- Answer 5 context questions
- Gemini generates Arc I (~10 seconds)

**2. Generate today's tasks** — go to `localhost:3000/admin`:
- Click **Run Thinking** — AI Core generates tasks for today

**3. Do the tasks** — open `localhost:3000/daily-plan`:
- Tick tasks as completed, edit, add subtasks

**4. End the day** — back in `/admin`:
- Write an end-of-day note
- Click **Run Learning** — calculates ECR, updates RPG stats
- Click **Advance to next day →**

**5. Repeat** for up to 30 days, then Arc Bridge triggers.

---

## Database

SQLite file at `db/grindos.db` — created automatically when AI Core first starts. Shared by both `ai/` and `api/`.

To inspect raw data:
```
GET http://localhost:8000/dev/db/dump
```

To reset a user to Day 1:
```
DELETE http://localhost:8000/dev/user/{id}/reset
```
Or use the **Reset User** button in the admin panel.

---

## Docs

Architecture and design docs are in `docs/`. To read them in the browser:

```bash
pip install mkdocs-material   # first time only
mkdocs serve --dev-addr 127.0.0.1:8001
```

Open **http://127.0.0.1:8001**

---

## Environment Variables

### `ai/.env`
| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API` | ✅ | Gemini API key |
| `GEMINI_API_BACKUP` | optional | Backup key, auto-used on rate limit |
| `GEMINI_MODEL` | optional | Default: `gemini-2.5-flash-lite` |
| `APP_ENV` | optional | Set to `development` to enable `/dev/*` endpoints |
| `DATABASE_URL` | optional | Default: `db/grindos.db` at project root |

### `api/.env`
| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | optional | Default: `8080` |
| `DATABASE_URL` | optional | Default: `../db/grindos.db` |
| `AI_CORE_URL` | optional | Default: `http://localhost:8000` |

### `web/.env`
| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | optional | Default: `http://localhost:8080` |
