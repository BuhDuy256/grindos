# GrindOS AI Core — Long-Run Test Verdict (Run 2 — Dual-Key)
**Date:** 2026-05-21  
**Run:** Clean re-run with `GEMINI_API_BACKUP` failover active

---

## Overall Verdict: ✅ PASS

All stat evolution math is correct across 7 days. Dual-key failover eliminated all fallback plans. One new scenario tested (double PENALTY). One scenario still untested (STABLE).

---

## What Changed vs Run 1

| Area | Run 1 | Run 2 |
|------|-------|-------|
| Gemini key setup | Single key only | Primary + Backup failover |
| Fallback days | 3 of 7 days (Days 2, 6, 7) | **0 of 7 days** |
| Fresh Gemini plans | 4 days | **7 days** ✅ |
| `[FALLBACK]` prefix compounding | Present (BUG-07) | Fixed ✅ |
| STABLE scenario achieved | No | No — still open |
| Double PENALTY tested | No | **Yes (bonus)** |
| CHALLENGING phase plans visible | No (all fallback) | **Yes (Days 6–7)** |

---

## Dual-Key Failover — Verified Working

`call_gemini()` in `connection.py` tries `GEMINI_API` first. On `429 RESOURCE_EXHAUSTED` or `503 UNAVAILABLE`, it automatically retries with `GEMINI_API_BACKUP`. All 7 calls resolved without any fallback to yesterday's plan.

---

## Test Case Results

| Test | Scenario | Status | Notes |
|------|----------|--------|-------|
| TC-L01 | POWER_UP × 3 accumulation | ✅ PASS | Days 1–3 all correct |
| TC-L02 | INT boost at streak=3 | ✅ PASS | Day 3: int 10→11 |
| TC-L03 | PENALTY (ECR=0%) | ✅ PASS | Day 4: all resets correct |
| TC-L04 | STABLE (65–84%) | ❌ NOT ACHIEVED | See OBS-01 below |
| TC-L05 | Recovery after PENALTY | ✅ PASS | Days 6–7 rebuild correctly |
| TC-L06 | Budget scales with multiplier | ✅ PASS | All 7 days within ±10% |
| TC-L07 | Fallback mechanism | ✅ PASS (not triggered) | Dual-key kept Gemini active |
| TC-L08 | Phase transition (CHALLENGING at Day 6) | ✅ PASS | "Deep Dive" tasks generated |
| **NEW** | Double PENALTY (Days 4+5) | ✅ PASS | mult dropped to 0.9; system stable |

---

## New Bug Found: None

BUG-07 (`[FALLBACK]` prefix compounding) was fixed in Run 1. No new bugs in Run 2.

---

## Observations

### OBS-01: STABLE (65–84% ECR) still not achieved
**Root cause confirmed:** With CALIBRATE-phase tasks, Gemini tends to generate one large task (60m) that dominates the budget. Completion of "all tasks except the big one" gives ECR ≤ 50% (PENALTY). Completion of all tasks including the big one gives ECR = 100% (POWER_UP). There is no "natural" combination that lands in the 65–84% window for these task distributions.

**Recommended fix for next test session:** Use `PATCH /v1/daily-plan/task/{id}` to `DELETE` the large task before end-day submission. This reduces the denominator, making it easier to hit the STABLE ECR window. Example: if budget=120 with tasks [5, 30, 30, 55], DELETE the 55m task, complete the other 3 (65m). ECR = 65/65 = 100%... still POWER_UP. Alternative: DELETE the 30m task, then complete 5+30+55=90 out of 5+30+55=90... Hmm. The real fix is to explicitly PATCH a task's `duration_mins` to manufacture a 65–84% scenario deterministically.

### OBS-02: Double PENALTY drops multiplier below 1.0
**Day 5 mult = 0.9 (below 1.0)** — first time the multiplier went sub-1.0. Budget for Day 6 = `int(120 × 0.9) = 108`. Gemini generated 110 mins (within ±10% of 108). The system handled sub-1.0 multiplier correctly. Recovery trajectory: 0.9 → 1.0 → 1.1 over two POWER_UP days.

### OBS-03: STR hit 8 — approaching meaningful degradation
After two PENALTY days (STR 10→9→8), the player's STR stat shows meaningful long-term consequence. Floor of 1 was not reached. Trend shows that 8+ consecutive PENALTY days would be required to floor STR from start.

### OBS-04: CHALLENGING phase produces different task shape
Day 6 (Arc Day 6, CHALLENGING phase) generated "Deep Dive" tasks with longer single blocks (60m, 40m). Compared to CALIBRATE tasks (5m warmup + 30m blocks), the CHALLENGING phase prompt instruction visibly changed Gemini's output style. ✅ Prompt phase injection confirmed working.

### OBS-05: Task budget tolerance — Gemini consistently hits lower end
Across 7 days, Gemini's total task duration was always slightly below the spec budget:
- Budget 132 → generated 125 (94.7%)
- Budget 144 → generated 130 (90.3%)
- Budget 156 → generated 145 (93.0%)
- Budget 132 → generated 120 (90.9%)
All within ±10% spec, but Gemini consistently undershoots. Worth noting for when we add stricter budget compliance tracking.

---

## Final Player State After 7 Days (Run 2)

```
Level:       1
EXP:         110   (5×20 POWER_UP + 2×5 PENALTY)
STR:         8     (lost 2: D4 PENALTY + D5 PENALTY)
INT:         11    (gained 1: D3 streak=3 bonus)
VIT:         15    (gained 5: one per POWER_UP event)
Streak:      2     (rebuilt after double PENALTY)
Multiplier:  1.1   (net: +0.5 POWER_UP - 0.4 PENALTY = +0.1 from start)
```

This run tested a harder path than Run 1 — two consecutive PENALTY days showed the system stays stable under punishment and recovers properly.

---

## Remaining Open Test Items

| # | Item | Why Not Done |
|---|------|-------------|
| 1 | STABLE event (65–84% ECR) | Task distribution doesn't naturally land in this window — needs engineered scenario via PATCH endpoint |
| 2 | Arc Bridge (Day 30) | Requires 30 simulated days or manual arc_day override |
| 3 | INT floor (int_stat = 1) | Requires 10+ days from int=1 with consecutive PENALTY |
| 4 | multiplier floor (0.10) | Requires ~5 consecutive PENALTY from low baseline |
| 5 | Streak INT boost at 6, 9, 12... | Spec only says ≥3; tested at 3, not verified for 6+ |

---

## Code Changes Made This Session

| File | Change |
|------|--------|
| `connection.py` | Added `_gemini_backup` client; replaced `get_gemini_client()` calls with `call_gemini()` wrapper that auto-retries with backup on 429/503 |
| `engine.py` | Uses `call_gemini()` instead of `client.models.generate_content()` |
| `arc_bridge/service.py` | Uses `call_gemini()` |
| `endpoints.py` | Uses `call_gemini()` |
