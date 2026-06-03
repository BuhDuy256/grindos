# GrindOS

Gamified productivity system — complete daily tasks, earn RPG stats, progress through 30-day arcs powered by AI.

---

## Quick Start

```bat
start.bat
```

Mở 3 terminal window (AI Core, Web API, Frontend) và tự động mở browser sau 4 giây.

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
| `ai/`  | Python / FastAPI | 8000 | Gemini pipelines, batch jobs, RPG stat engine |
| `api/` | Python / FastAPI | 8080 | REST API, auth, task CRUD |
| `web/` | Next.js / React  | 3000 | Frontend UI |

---

## Prerequisites

- Python 3.9+
- Node.js 18+
- A [Google AI Studio](https://aistudio.google.com) API key (Gemini)

---

## First-time Setup

### 1. AI Core

```bash
cd ai
pip install -r requirements.txt
```

Tạo `ai/.env`:
```
GEMINI_API=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash-lite
APP_ENV=development
```

### 2. Web API

```bash
cd api
pip install -r requirements.txt
```

Tạo `api/.env`:
```
AI_CORE_URL=http://localhost:8000
JWT_SECRET=change-this-in-production
```

### 3. Frontend

```bash
cd web
npm install
```

Tạo `web/.env.local` (tuỳ chọn):
```
NEXT_PUBLIC_API_URL=http://localhost:8080
```

---

## Khởi động thủ công (thay thế cho start.bat)

```bash
# Terminal 1 — AI Core
cd ai && uvicorn main:app --port 8000 --reload

# Terminal 2 — Web API
cd api && uvicorn main:app --port 8080 --reload

# Terminal 3 — Frontend
cd web && npm run dev
```

---

## Tài khoản mặc định

| Username | Password  | Quyền |
|----------|-----------|-------|
| admin    | admin123  | Admin |
| Hero     | 123       | User  |
| Duy Lê   | 123       | User  |

> Tài khoản admin có thể truy cập Admin Panel để chạy pipelines và quản lý users.

---

## User Flow

```
/register  →  /onboarding  →  /daily-plan
/login     →  /daily-plan  (hoặc /onboarding nếu chưa setup)
```

1. **Register** (`/register`) — tạo username + password
2. **Onboarding** (`/onboarding`) — khai báo mục tiêu, trả lời 5 câu hỏi → AI tạo arc 30 ngày
3. **Daily Plan** (`/daily-plan`) — xem tasks hôm nay, tick off, ghi chú cuối ngày
4. **Stats** (`/stats`) — RPG stats (Level/EXP/STR/INT/VIT) + lịch sử ECR
5. **Profile** (`/profile`) — theme, font size, màu accent, logout

---

## Admin Panel

Truy cập `/admin` (yêu cầu tài khoản admin).

| Action        | Mô tả                                               |
|---------------|-----------------------------------------------------|
| Run Thinking  | Generate task plan hôm nay cho user (gọi Gemini)    |
| Run Learning  | Tính ECR, cập nhật player stats                     |
| Sim Date      | Điều chỉnh ngày để test multi-day flow              |
| Reset User    | Xoá toàn bộ plans/stats, bắt đầu lại từ Day 1      |

---

## URLs

| URL | Mô tả |
|-----|-------|
| http://localhost:3000 | Frontend |
| http://localhost:3000/login | Đăng nhập |
| http://localhost:3000/register | Đăng ký |
| http://localhost:3000/daily-plan | Task list hôm nay |
| http://localhost:3000/stats | RPG stats + ECR chart |
| http://localhost:3000/admin | Admin Panel |
| http://localhost:8080/docs | Web API — Swagger UI |
| http://localhost:8000/docs | AI Core — Swagger UI |

---

## Database

SQLite tại `db/grindos.db` — tạo tự động khi AI Core khởi động lần đầu. Dùng chung cho cả `ai/` và `api/`.

Xem raw data:
```
GET http://localhost:8000/dev/db/dump
```

Reset user về Day 1:
```
DELETE http://localhost:8000/dev/user/{id}/reset
```
Hoặc dùng nút **Reset User** trong admin panel.

---

## Environment Variables

### `ai/.env`
| Variable | Bắt buộc | Mặc định |
|----------|----------|---------|
| `GEMINI_API` | ✅ | — |
| `GEMINI_API_BACKUP` | — | backup key, tự dùng khi rate limit |
| `GEMINI_MODEL` | — | `gemini-2.5-flash-lite` |
| `APP_ENV` | — | set `development` để bật `/dev/*` endpoints |
| `DATABASE_URL` | — | `db/grindos.db` ở project root |

### `api/.env`
| Variable | Bắt buộc | Mặc định |
|----------|----------|---------|
| `AI_CORE_URL` | — | `http://localhost:8000` |
| `JWT_SECRET` | — | `grindos-dev-secret-change-in-prod` |
| `PORT` | — | `8080` |
| `DATABASE_URL` | — | `../db/grindos.db` |

### `web/.env.local`
| Variable | Bắt buộc | Mặc định |
|----------|----------|---------|
| `NEXT_PUBLIC_API_URL` | — | `http://localhost:8080` |

---

## Docs

Architecture docs ở `docs/`. Đọc trên browser:

```bash
pip install mkdocs-material
mkdocs serve --dev-addr 127.0.0.1:8001
```
