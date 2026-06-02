# GrindOS

Gamified productivity system — architecture and design documentation.

---

## Services

| Service | Stack | Description |
|---|---|---|
| `ai/` | Python / FastAPI | AI Core — Gemini pipelines, batch jobs, RPG stat engine |
| `api/` | Go / Gin | Web Backend — auth, business logic, REST API for web + mobile |
| `web/` | Next.js / React | Frontend — UI, pages, calls Go API |

## Quick Links

- [Web Architecture](architecture/web-architecture.md)
- [AI Backend](architecture/ai-architecture.md)
- [Database](architecture/database.md)
- [AI Core — API Endpoints](architecture/ai-core/05_api_endpoints_contract.md)
