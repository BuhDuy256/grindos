# Contributing to `thinking/`

## Trách nhiệm

`thinking/` chỉ làm **một việc**: sinh danh sách task cho ngày hôm nay của một user.

Pipeline chạy lúc 4 AM (hoặc khi dev trigger qua `/dev/thinking/run-for-user`). Nó đọc trạng thái user từ DB, build context, gọi Gemini một lần duy nhất, và ghi kết quả vào DB.

---

## Cấu trúc

```
thinking/
├── context.py          # ThinkingContext + build_context() — NƠI DUY NHẤT thêm data vào prompt
├── engine.py           # Orchestrator: build context → prompt → Gemini → DB
├── guardrails.py       # Pydantic schemas cho Gemini response_schema
└── prompts/
    └── daily_task/
        ├── prompt.txt  # Template instruction text với {placeholders}
        └── service.py  # render(ThinkingContext) → string
```

---

## Quy tắc bắt buộc

### 1. Không import từ `learning/`
`thinking/` không được import bất kỳ thứ gì từ `learning/`. Giao tiếp duy nhất giữa hai pipeline là **qua database**: learning ghi stats → thinking đọc stats ở lần chạy tiếp theo.

```python
# ❌ KHÔNG làm thế này
from ai_core_service.learning.math_stats import compute_ecr

# ✅ Shared utilities dùng arc_utils
from ai_core_service.arc_utils import compute_arc_day_index
```

### 2. Shared utilities ở `arc_utils.py`
Các hàm dùng chung giữa `thinking` và `learning` (tính arc day, phase, budget) sống ở `ai_core_service/arc_utils.py`. Không được duplicate chúng vào `engine.py`.

### 3. Thêm context mới vào prompt → chỉ sửa 2 file

| Cần thêm gì | Sửa file nào |
|-------------|-------------|
| Data mới (fetch từ DB, format) | `context.py` — thêm field vào `ThinkingContext`, fetch trong `build_context()` |
| Instruction mới trong prompt | `prompt.txt` — thêm `{placeholder}` và text hướng dẫn |
| Logic format text | `context.py` — thêm helper `_format_*()` |

`engine.py` và `service.py` không cần đổi khi thêm context mới.

### 4. Một Gemini call duy nhất
`engine.py` chỉ được gọi `call_gemini()` **một lần** per user per day. Không thêm Gemini calls trong pipeline (ngoại trừ retry logic đã có sẵn).

### 5. Idempotent
Nếu plan đã tồn tại cho ngày đó, `run_thinking_for_user()` phải return ngay mà không làm gì. Không được tạo duplicate plans.

---

## Thêm field vào prompt — ví dụ

**Muốn thêm `user_goal` vào context:**

1. `context.py` — thêm field và fetch:
```python
@dataclass
class ThinkingContext:
    ...
    user_goal: str   # ← thêm vào đây

def build_context(...):
    ...
    return ThinkingContext(
        ...
        user_goal=ai_context["main_goal"],  # ← fetch từ ai_context
    )

def format_context_for_prompt(ctx):
    return {
        ...
        "user_goal": ctx.user_goal,   # ← thêm vào dict
    }
```

2. `prompt.txt` — thêm placeholder:
```
Player's main goal: {user_goal}
```

Xong. Không cần đổi `engine.py` hay `service.py`.
