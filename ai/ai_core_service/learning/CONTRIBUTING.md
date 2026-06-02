# Contributing to `learning/`

## Trách nhiệm

`learning/` chỉ làm **một việc**: xử lý kết quả cuối ngày của một user — chạy các thuật toán phân tích, tổng hợp kết quả, và cập nhật stats/summary vào database.

Pipeline chạy lúc 11:59 PM (hoặc khi dev trigger qua `/admin/learning/run`). Nó đọc tasks đã completed từ DB, chạy qua các algo được cấu hình, tổng hợp kết quả, ghi vào DB, và đôi khi gọi Gemini một lần (Arc Bridge — Day 30 only).

---

## Cấu trúc

```
learning/
├── algorithms/
│   ├── base.py                    # AlgoInput dataclass + BaseAlgorithm ABC
│   └── ecr_stat_evolution/
│       ├── math_stats.py          # ECR formula + POWER_UP/STABLE/PENALTY — pure Python, no DB
│       └── algo.py                # EcrStatEvolutionAlgo — wraps math_stats
├── config.yaml                    # Chọn algo nào chạy
├── orchestrator.py                # Discovery → brainstorm → synthesize → DB write
└── prompts/
    └── arc_bridge/
        ├── prompt.txt
        └── service.py
```

---

## Flow chạy

```
config.yaml
    ↓ _load_enabled()
enabled_algos[]
    ↓ for each algo: algo.run(AlgoInput)
brainstorm: {algo_name: result_dict}   ← in-memory, không ghi DB
    ↓ _synthesize(brainstorm)
synthesis: {ecr_int, event, updated_stats, learning_summary}
    ↓
DB: daily_plans.ecr_score, daily_plans.learning_summary, player_stats
```

---

## Quy tắc bắt buộc

### 1. Không import từ `thinking/`
`learning/` không được import bất kỳ thứ gì từ `thinking/`. Giao tiếp duy nhất giữa hai pipeline là **qua database**: thinking ghi plan/tasks → learning đọc tasks đã completed.

```python
# ❌ KHÔNG
from ai_core_service.thinking.engine import anything

# ✅ Shared utilities
from ai_core_service.arc_utils import compute_arc_day_index
```

### 2. Algo không được ghi DB trực tiếp
`algo.run()` chỉ được nhận `AlgoInput` và trả về `dict`. Toàn bộ DB write chỉ xảy ra trong `orchestrator.py` sau bước `_synthesize()`.

```python
# ❌ KHÔNG làm trong algo
def run(self, input):
    plan_dao.update_daily_plan(...)   # KHÔNG

# ✅ Chỉ return dict
def run(self, input):
    return {"ecr": 87.5, "event": "POWER_UP", ...}
```

### 3. `math_stats.py` (và file pure-math trong algo folder) — không có DB, không có Gemini
Logic tính toán phải là pure Python: nhận dict, trả về dict. Test được bằng cách truyền dict trực tiếp mà không cần kết nối DB.

### 4. Gemini chỉ được gọi trong Arc Bridge (Day 30)
`orchestrator.py` gọi Gemini **chỉ khi** `arc_day_index == 30`. Không thêm Gemini call vào pipeline thường ngày.

### 5. ECR tính trên tasks không bị DELETED
```python
active = [t for t in tasks if t["modification_state"] != "DELETED"]
```
Tasks bị soft-delete vẫn giữ trong DB nhưng không tính vào ECR.

---

## Thêm algo mới

1. Tạo folder `algorithms/my_algo_name/`
2. Tạo `algorithms/my_algo_name/__init__.py` (empty)
3. Tạo `algorithms/my_algo_name/algo.py`:

```python
from ai_core_service.learning.algorithms.base import AlgoInput, BaseAlgorithm

class MyAlgo(BaseAlgorithm):
    name = "my_algo_name"  # phải khớp tên folder

    def run(self, input: AlgoInput) -> dict:
        # đọc input.tasks, input.stats, input.ai_context...
        # tính toán...
        return {"my_result": 42}
```

4. Thêm vào `config.yaml`:
```yaml
algorithms:
  - name: ecr_stat_evolution
    enabled: true
  - name: my_algo_name
    enabled: true
```

5. Nếu algo output cần được ghi vào DB, thêm xử lý vào `_synthesize()` trong `orchestrator.py`.

---

## Sửa công thức ECR hay stat evolution

Chỉ cần sửa `algorithms/ecr_stat_evolution/math_stats.py`:

```python
# Thay đổi ngưỡng POWER_UP từ 85% → 80%
if ecr >= 80:   # ← sửa đây
    event = "POWER_UP"
```

`orchestrator.py` và `algo.py` không cần đổi.

---

## Arc Bridge — khi nào và như thế nào

Arc Bridge được trigger trong `orchestrator.py` khi `arc_day_index == 30`. Nó đọc 30 ngày lịch sử, gọi Gemini, và ghi `bridge_choices` + `user_persona_summary` vào `ai_contexts`.

Nếu muốn thay đổi nội dung Arc Bridge prompt → sửa `prompts/arc_bridge/prompt.txt`.
