# AI Architecture

## Overview

AI Core (`ai/`) là một FastAPI microservice độc lập, chịu trách nhiệm toàn bộ phần AI: sinh task hằng ngày, tính toán stats, và điều hướng Arc. Web API không bao giờ gọi Gemini trực tiếp — mọi LLM interaction đều đi qua AI Core.

```
Web API  ──POST /dev/thinking/run──►  AI Core  ──►  Gemini API
                                          │
                                          ▼
                                     db/grindos.db
```

---

## Nguyên tắc thiết kế

**Python xử lý tất cả math, AI chỉ sinh text.**
ECR, stat evolution, multiplier, streak — tất cả là Python thuần. Gemini không bao giờ được phép tính điểm hay quyết định kết quả. Nó chỉ nhận context và trả về structured JSON (tasks, arc name, arc bridge choices).

**Single-turn only.**
Không có chat session, không có agent loop, không có multi-step reasoning. Mỗi pipeline call là 1 request Gemini duy nhất với `response_schema` enforced.

**Stateless prompt pipeline.**
Mọi context cần thiết được inject vào prompt tại thời điểm gọi — không có shared memory giữa các lần gọi.

---

## Cấu trúc module

```
ai/ai_core_service/
├── retrieving/          # DAO layer — đọc/ghi SQLite trực tiếp
│   ├── connection.py    # DB path + Gemini client init + dual-key failover
│   ├── user_dao.py      # users, player_stats, ai_contexts
│   └── plan_dao.py      # daily_plans, tasks (recursive CTE)
│
├── thinking/            # 4 AM pipeline — sinh task hằng ngày
│   ├── context.py       # ThinkingContext dataclass + build_context()
│   ├── engine.py        # Orchestrator: build context → prompt → Gemini → DB
│   ├── guardrails.py    # Pydantic response_schema models
│   └── prompts/
│       └── daily_task/
│           ├── prompt.txt   # Template với {placeholders}
│           └── service.py   # render(ThinkingContext) → string
│
├── learning/            # 11:59 PM pipeline — tính ECR và update stats
│   ├── math_stats.py    # ECR formula, POWER_UP/STABLE/PENALTY logic
│   ├── orchestrator.py  # Stats update + Arc Bridge trigger
│   └── prompts/
│       └── arc_bridge/
│           ├── prompt.txt
│           └── service.py
│
└── routing/
    ├── endpoints.py      # Public API (onboarding, daily-plan, player)
    └── dev_endpoints.py  # Dev-only (run pipelines, reset user, DB dump)
```

---

## Thinking Pipeline (4 AM)

**Mục tiêu:** Sinh danh sách task cho ngày hôm nay của mỗi user.

```
build_context(user_id, stats, ai_context, date)
    → fetch last 5 days history (plan_dao)
    → compute arc_day_index, phase, budget, milestone
    → return ThinkingContext

get_hydrated_prompt(ThinkingContext)
    → render prompt.txt với context
    → return string

call_gemini(prompt, response_schema=DailyPlanOutput)
    → constrained decoding → JSON guaranteed valid

validate_plan_output(json, task_budget)
    → check tổng phút ±10%

create_plan_with_tasks(user_id, date, tasks)
    → atomic INSERT vào daily_plans + tasks
```

**Idempotent:** Nếu plan đã tồn tại cho ngày đó, bỏ qua.

**Fallback:** Nếu Gemini fail sau 3 retries, dùng lại tasks của hôm qua với prefix `[FALLBACK]`.

### ThinkingContext — interface mở rộng

`context.py` là điểm duy nhất cần chỉnh khi muốn thêm data mới vào prompt:

```python
@dataclass
class ThinkingContext:
    stats: dict                    # player stats
    user_persona_summary: str      # AI-generated profile (từ Arc Bridge)
    arc_day_index: int
    phase: str                     # CALIBRATE / CHALLENGING / ROUTINE
    phase_instruction: str
    task_budget: int               # 120 * difficulty_multiplier
    current_milestone: str         # W1/W2/W3/W4 objective
    recent_history: list[dict]     # 5 ngày gần nhất (tasks + ECR + user note)
```

Thêm field mới → thêm vào `ThinkingContext` + update `prompt.txt`. `engine.py` và `service.py` không cần đổi.

---

## Learning Pipeline (11:59 PM)

**Mục tiêu:** Tính ECR từ tasks đã tick, update stats, trigger Arc Bridge nếu Day 30.

```
get_daily_plan + get_tasks_tree
    → tính completed_mins / total_mins

compute_ecr() → float
apply_stat_evolution(stats, ecr) → (updated_stats, event_type)
    POWER_UP (≥85%): multiplier +0.1, EXP +20, VIT +1, streak +1
                     if streak ≥ 3: INT +1
    STABLE (65-84%): no change
    PENALTY  (<65%): multiplier -0.2, EXP +5, STR -1, streak = 0

update_player_stats(user_id, updated_stats)
update_daily_plan(plan_id, ecr_score=ecr)

if arc_day_index == 30:
    → call Arc Bridge AI service
    → generate 2-3 arc transition choices
    → persist to ai_contexts.metadata
```

**Math boundaries:** `multiplier` floor = 0.10, `str_stat` floor = 1, `int_stat` floor = 1.

---

## Gemini Integration

**Dual-key failover** trong `connection.py`:

```python
for client in [primary, backup]:
    try:
        return client.models.generate_content(...)
    except RateLimitError:
        continue  # thử key tiếp theo
```

**Constrained decoding** — Pydantic model truyền thẳng vào Gemini:

```python
call_gemini(
    contents=prompt,
    config=GenerateContentConfig(
        response_mime_type="application/json",
        response_schema=DailyPlanOutput,  # Gemini enforce schema ở tầng sampling
    )
)
```

Không cần parse hay validate format — Gemini guarantee output khớp schema. `validate_plan_output()` chỉ check business logic (budget ±10%).

---

## Arc System

| Phase | Ngày | Đặc điểm prompt |
|-------|------|-----------------|
| CALIBRATE | 1–5 | Task nhẹ, low-barrier, build momentum |
| CHALLENGING | 6–20 | Dense deep work, push skill boundaries |
| ROUTINE | 21–30 | Steady load, habit formation |

**Day 30 — Judgment Day:** Phase ROUTINE instruction kích hoạt Arc Bridge. Learning pipeline phân tích 30 ngày execution, Gemini sinh 2–3 Arc II path dựa trên behavioral pattern thực tế của user.

**Milestone mapping:**
```python
week_number = min(((arc_day_index - 1) // 7) + 1, 4)
```
Mỗi tuần map sang 1 trong 4 milestones được sinh lúc onboarding. Chỉ milestone của tuần hiện tại được inject vào prompt (Fog of War).
