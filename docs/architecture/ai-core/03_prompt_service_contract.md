# Documentation: 03_prompt_service_contract.md
# Project: GrindOS Core AI Engine (MVP Version)

## 1. Prompt-as-a-Service (PaaS) Paradigm
To ensure maximum modularity, maintainability, and clean version control, GrindOS enforces a strict decoupling of raw prompt text and Python execution logic. 

Every AI task in the system (e.g., daily task generation, arc bridging) must be contained within its own dedicated service subdirectory inside a `prompts/` folder. This subdirectory must always function as an isolated component containing exactly two files:
1. `prompt.txt`: The raw system prompt written in pure markdown/text, containing static instructions and bracketed parameters (e.g., `{user_stats}`).
2. `service.py`: The functional python adapter that reads `prompt.txt`, dynamically hydrates the data variables, handles Pydantic schema guardrails, and exposes a clean interface.

---

## 2. Directory Structure Blueprint
Copilot must adhere to this exact file structural pattern when scaffolded:

```text
📁 [module_folder]/                  # e.g., thinking/ or learning/
└── 📁 prompts/                      # Dedicated prompt domain root
    └── 📁 [service_name]/           # Isolated service boundary (e.g., daily_task/)
        ├── 📄 prompt.txt            # Pure text template (Strictly NO Python code)
        └── 📄 service.py            # Python adapter class/functions

```

expected tree structure:

```
📁 ai_core_service/
│
├── 📁 routing/
│   └── 📄 endpoints.py
│
├── 📁 retrieving/
│   ├── 📄 user_dao.py
│   └── 📄 plan_dao.py
│
├── 📁 thinking/
│   ├── 📄 __init__.py
│   ├── 📄 engine.py             # Gọi đến daily_task_service để lấy Prompt đã nhồi data
│   │
│   └── 📁 prompts/              # THƯ MỤC CHỨA CÁC SERVICE PROMPT CỦA THINKING
│       └── 📁 daily_task/       # Cụm Service sinh Task đầu ngày
│           ├── 📄 prompt.txt    # Chứa Master Prompt thô (có các biến {phase}, {stats}...)
│           └── 📄 service.py    # Đọc prompt.txt, nhận data từ engine, trả về Prompt hoàn chỉnh
│
└── 📁 learning/
    ├── 📄 __init__.py
    ├── 📄 orchestrator.py       # Gọi các phân tích toán học + các Prompt Service dưới đây
    ├── 📄 math_stats.py
    │
    └── 📁 prompts/              # THƯ MỤC CHỨA CÁC SERVICE PROMPT CỦA LEARNING
        └── 📁 arc_bridge/       # Cụm Service xử lý chuyển giao Arc (Chạy vào ngày 30)
            ├── 📄 prompt.txt    # Chứa Prompt thô hướng dẫn AI đúc kết 30 ngày & tạo Arc mới
            └── 📄 service.py    # Đọc prompt.txt, nhồi log 30 ngày, expose service cho orchestrator
```

---

## 3. Strict Code Implementation Contract

### A. Template File Contract (`prompt.txt`)

* Must contain placeholders compatible with standard Python string formatting (`.format()`).
* Must define structural anchors separating global role instructions, dynamic context blocks, and JSON output schema expectations.

### B. Adapter File Contract (`service.py`)

* **Statelessness:** The functions inside `service.py` must not hold any memory or instance variables.
* **Path Resolution:** File reads must use absolute pathing derived from `__file__` to guarantee cross-platform and current working directory safety during batch execution.
* **Error Handling:** If token encoding or string replacement fails, it must throw a explicit domain exception rather than returning a partial prompt.

---

## 4. Standard Reference Implementation for Copilot

When instructed to write a Prompt Service, Copilot must implement the code following this structural standard:

### Sample `prompt.txt` Layout:

```text
[SYSTEM INTERFACE: GRINDOS TERMINAL OPERATOR]
Tone: Toxic, Strict, Punitive.

[CURRENT OPERATIONAL PARAMETERS]
- Player Stats Snapshot: {user_stats}
- Active Milestone Objective: {current_milestone}
- Campaign Phase Mode: {current_phase}

[PHASE ENFORCEMENT PROTOCOL]
{phase_instruction}

[COMPLIANCE EXPECTATION]
Evaluate the parameter block and emit the precise DailyPlan JSON payload.

```

### Sample `service.py` Layout:

```python
import os
from typing import Dict, Any

def render_prompt_template(
    service_dir: str, 
    template_name: str, 
    context: Dict[str, Any]
) -> str:
    """
    Core utility function to securely load and format prompt text templates.
    """
    prompt_path = os.path.join(service_dir, template_name)
    
    if not os.path.exists(prompt_path):
        raise FileNotFoundError(f"Critical System Failure: Prompt asset missing at {prompt_path}")
        
    with open(prompt_path, "r", encoding="utf-8") as file:
        raw_template = file.read()
        
    try:
        return raw_template.format(**context)
    except KeyError as e:
        raise ValueError(f"Prompt Hydration Failure: Missing context variable {e}")

def get_hydrated_prompt(stats: dict, milestone: str, phase: str, instruction: str) -> str:
    """
    Exposed public contract for the specific prompt service domain.
    """
    current_dir = os.path.dirname(os.path.abspath(__file__))
    
    context_payload = {
        "user_stats": str(stats),
        "current_milestone": milestone,
        "current_phase": phase,
        "phase_instruction": instruction
    }
    
    return render_prompt_template(current_dir, "prompt.txt", context_payload)

```

---

## 5. Guardrail Integration

The service script is responsible for ensuring the compiled prompt string is attached to the Gemini API call configuration along with the designated `response_mime_type: "application/json"` and Pydantic validator targets defined in `thinking/guardrails.py`.
