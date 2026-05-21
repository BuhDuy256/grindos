# Documentation: 04_batch_execution_logic.md
# Project: GrindOS Core AI Engine (MVP Version)

## 1. Temporal Constraints & Timezone Batching
GrindOS operates strictly on **Client Local Time** to evaluate schedule windows. The system does not run a single global cron job; instead, it executes separate cohort batching based on the user's registered timezone field (`users.timezone`).

* **Thinking Pipeline (Task Creation):** Must execute and complete at **4:00 AM** local time for each respective timezone cohort.
* **Learning Pipeline (Data Digestion):** Must execute and complete at **11:59 PM** local time for each respective timezone cohort.

---

## 2. Morning Thinking Pipeline Logic (4:00 AM)

### A. Phase Extraction Formula
The engine computes the progress index of the active campaign to select the proper prompt configuration injection.
$$\text{Arc Day Index} = (\text{Current Global Day} - \text{Arc Start Day}) + 1$$

Based on the `Arc Day Index`, Python hardcodes the following parameter states (Single-turn Parameter Injection):

| Arc Day Index Range | Campaign Phase Mode | Enforced `phase_instruction` String Variable |
| :--- | :--- | :--- |
| **Days 1 to 5** | `CALIBRATE` | "The system is initializing. Lower cognitive friction. Prioritize hyper-actionable, low-barrier Starter tasks (<5 mins) to build momentum. Keep total budget restricted." |
| **Days 6 to 20** | `CHALLENGING` | "The system is entering peak conflict mode. Escalate difficulty. Enforce dense, high-load Deep Work tasks. Force user into aggressive skill acquisition boundaries." |
| **Days 21 to 30** | `ROUTINE` | "The system is stabilizing into habits. Maintain steady load. Balance tasks evenly. If day equals 30, activate Judgment Day protocol: swap standard task array for exactly ONE comprehensive evaluation challenge task." |

### B. Time Budget Scaling Formula
Before passing context to the prompt service, Python enforces a strict mathematical calculation for the maximum cumulative task duration allowed for the day:
$$\text{Task Duration Budget (Mins)} = \text{int}(120 \times \text{difficulty\_multiplier})$$
* *Guardrail Constraint:* The prompt service validator must reject any LLM JSON return where the sum of `tasks.duration_mins` deviates from this budget by more than $\pm 10\%$, or if any task duration is not a multiple of 5.

---

## 3. Nightly Learning Pipeline Logic (11:59 PM)

### A. Mathematical Stat Evolution (Deterministic)
The pipeline extracts the day's record from `tasks` where `daily_plan_id` matches today. It computes the absolute **Energy Completion Rate (ECR)**:
$$\text{ECR} = \left( \frac{\text{Sum of duration\_mins of COMPLETED tasks}}{\text{Sum of duration\_mins of ALL tasks for today}} \right) \times 100$$

Python processes the state transition based exclusively on the computed ECR value:



```
              ┌───────────────────────────────┐
              │ Compute ECR Score for the Day │
              └──────────────┬────────────────┘
                             │
     ┌───────────────────────┼───────────────────────┐
     ▼                       ▼                       ▼
[ ECR >= 85% ]         [ 65% <= ECR <= 84% ]     [ ECR < 65% ]
Event: POWER UP           Event: STABLE         Event: PENALTY


* Multiplier += 0.10      - Multiplier: No change - Multiplier -= 0.20
* EXP += 20               - EXP: No change        - EXP += 5
* VIT_stat += 1           - Stats: No change      - STR_stat -= 1
* Streak += 1                                     - Streak = 0
* If Streak >= 3:
INT_stat += 1

```

* *Boundary Protections:* `difficulty_multiplier` has a strict floor of `0.10`. `str_stat` and `int_stat` have a strict floor of `1`.

### B. Conditional Dynamic Bridge (Arc Transition Logic)
If `Arc Day Index == 30`, after processing the mathematical stat evolution, the orchestrator invokes the AI service `learning/prompts/arc_bridge/service.py`:

1.  **Context Aggregation:** Retrieving fetches all `daily_plans` and `user_note` records spanning the last 30 days.
2.  **AI Engine Inference:** The LLM evaluates the real execution metrics versus the target goal, writes a 2-sentence psychological wrap-up profile to `user_persona_summary`, and devises the thematic concept for the subsequent Arc.
3.  **Branch Generation:** The AI creates exactly 2-3 interactive textual choices for the user's transition interface (e.g., Choice A: Hardcore execution focus vs. Choice B: Recovery consolidation).
4.  **State Freezing:** The chosen options and the structural blueprint of Arc 2 are committed to `ai_contexts.metadata`. `Arc Start Day` is reset to `Current Global Day + 1`.

---

## 4. Execution Error Fault Tolerance
* **JSON Repair Mechanism:** If the LLM generates syntax errors during the batch loop, the module must apply a 3-pass regex structural repair before throwing a delivery exception.
* **State Fallback:** If an API call fails after retries during the 4:00 AM batch, Python must copy yesterday's plan structure, adjust descriptions to an emergency backup template, set `origin_type` to `SYSTEM_GENERATED`, and mark the column to notify the administrative log, ensuring the user is never left without daily tasks.
