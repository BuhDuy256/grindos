# Documentation: 01_architecture_overview.md
# Project: GrindOS Core AI Engine (MVP Version)

## 1. Architectural Philosophy & Principles
GrindOS is designed as a **Stateless Prompt Pipeline Engine** controlled by deterministic Python logic. Unlike traditional autonomous AI agent architectures that rely on multi-step reasoning loops or self-directed tool execution—which are computationally unpredictable and expensive—GrindOS enforces strict boundaries between AI probabilistic text generation and system state management.

### Core Principles:
* **Math over LLM for Adaptation:** All RPG player stats, difficulty multipliers, streaks, and time budgets are calculated via pure, deterministic Python code during the end-of-day loop. The AI never evaluates performance or modifies core metrics; it only consumes them as immutable context.
* **Stateless Execution:** The AI Core does not maintain live memory or active chat sessions. Every request from the Web Backend is processed as a single-turn, synchronous API call (`Single-turn Generation`).
* **Fog of War Planning:** The user's roadmap is generated and revealed incrementally (one 4-week Arc at a time). Future milestones and phase shifts are hidden from the user and managed as raw text or structured attributes inside the database.
* **Deterministic Cost & Token Control:** By shifting state management to Python and consolidating execution into daily scheduled batches, the system guarantees a fixed number of API calls per user per day ($1 \text{ Call/User/Thinking Mode}$ and $1 \text{ Call/User/Learning Mode}$ only on specific conditions).

---

## 2. High-Level System Topography
The AI Core operates as an independent microservice that exposes APIs to the primary Web Backend. The service is segregated into 4 strictly decoupled modules:


```
       [Web BE REST API]
               │
               ▼
     ┌───────────────────┐
     │  ROUTING MODULE   │
     └─────────┬─────────┘
               │
     ┌─────────┴─────────┐
     │ RETRIEVING MODULE │ ◄───► [PostgreSQL / SQLite Database]
     └─────────┬─────────┘
               │
     ┌─────────┴──────────────────────────────────┐
     │             CORE ENGINE PIPELINES          │
     │                                            │
     │  ┌──────────────────┐  ┌────────────────┐  │
     │  │ THINKING MODULE  │  │ LEARNING STACK │  │
     │  │  (4:00 AM Batch) │  │(11:59 PM Batch)│  │
     │  └──────────────────┘  └────────────────┘  │
     └────────────────────────────────────────────┘

```
### Module Responsibilities:
1.  **ROUTING:** Handles inbound API requests from the Web Backend, orchestrates authentication, manages token rate-limiting, and triggers batch schedulers.
2.  **RETRIEVING:** Serves as the Data Access Object (DAO) layer. It abstracts all SQL queries, ensuring isolated data transactions and optimized batch reading/writing.
3.  **THINKING:** The generation engine. It runs early in the morning to pull user states, determine campaign phase modifiers, assemble prompt parameters, call the LLM API, and write ready-to-use `DailyPlans` into the database.
4.  **LEARNING:** The digestion and evolution engine. It processes behavioral logs late at night using mathematical algorithms to adjust stats, and selectively invokes AI services to handle dynamic transitions at the end of a campaign cycle.

---

## 3. Data Flow & Execution Lifecycles

### Lifecycle A: Morning Task Generation (Thinking Pipeline — 4:00 AM Client Time)

```

[Cron Trigger] -> [Retrieving Layer] -> Fetch active user stats, multipliers, and current milestones.
│
▼
[Python Logic]     -> Calculate day index within the Arc -> Map to exact Campaign Phase:
- Days 1-5:   CALIBRATE (Low friction starter tasks)
- Days 6-20:  CHALLENGING (High-load Deep Work emphasis)
- Days 21-30: ROUTINE (Stabilization + End-day Milestone Test)
│
▼
[Prompt Assembler] -> Fetch specific Phase variables -> Render static `prompt.txt` file.
│
▼
[LLM Call]         -> Execute Single-turn inference via structured JSON Pydantic output.
│
▼
[Retrieving Layer] -> Commit `DailyPlan`, generated `Tasks`, and structural `Subtasks` to DB.

```

### Lifecycle B: Nightly Digestion (Learning Pipeline — 11:59 PM Client Time)

```

[BE API Trigger]  -> [Retrieving Layer] -> Extract execution logs, check-in stats, and user notes.
│
▼
[Python Math]      -> Evaluate Energy Completion Rate (ECR):
- ECR >= 85%: POWER UP (Multiplier +0.1, Streak +1, Stats Increment)
- ECR 65-84%: STABLE (No changes)
- ECR < 65%:  PENALTY (Multiplier -0.2, Streak = 0, Stats Decrement)
│
▼
[Bridge Checker]   -> Is today Day 30 (End of Arc)?
├──> NO:  Commit stats immediately -> Lifecycle Ends.
└──> YES: Invoke `dynamic_bridge` AI Service -> Analyze 30-day behavior,
forge next Arc narrative, generate new Branch Options, and update DB.

```

---

## 4. Multi-Tenant Considerations & Optimization
To scale efficiently under a multi-user environment within MVP hardware constraints, the following rules must be enforced by the implementation:

* **Batch Isolation:** When running the Thinking or Learning batch pipelines, data must be grouped and processed sequentially or via controlled thread pools. Prompt injection cross-leakage is prevented by strict single-tenant parameter rendering per iteration loop.
* **Context Caching:** System architecture descriptions, strict LitRPG persona formatting rules, and formatting guardrails inside the prompt text files should utilize LLM Provider-level Context Caching where applicable to drastically minimize input token expenses.