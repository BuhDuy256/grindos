# GrindOS AI Core — Long-Run Evolution Test Verdict
**Date:** 2026-05-21  
**Simulation:** 7 days (2026-05-15 → 2026-05-21)

---

## Overall Verdict: ✅ PASS (with observations)

The stat evolution engine is **mathematically correct** across all tested scenarios. POWER_UP, PENALTY, and INT boost all fire at the right thresholds with the right deltas. One new bug was found and fixed (BUG-07). One intended scenario (STABLE) was not achievable with the skip-first-task strategy and requires a different approach.

---

## Math Verification — Expected vs Actual

### POWER_UP formula check (per event):
| Stat | Formula | Day 1 ✅ | Day 3 ✅ | Day 6 ✅ | Day 7 ✅ |
|------|---------|---------|---------|---------|---------|
| multiplier | +0.10 | 1.0→1.1 | 1.2→1.3 | 1.2→1.3 | 1.3→1.4 |
| exp | +20 | 0→20 | 40→60 | 85→105 | 105→125 |
| vit_stat | +1 | 10→11 | 12→13 | 14→15 | 15→16 |
| streak | +1 | 0→1 | 2→3 | 1→2 | 2→3 |
| int_stat | +1 if streak≥3 | no (streak=1) | **10→11** ✅ | no (streak=2) | **11→12** ✅ |

### PENALTY formula check (Day 4):
| Stat | Formula | Expected | Actual | Pass? |
|------|---------|----------|--------|-------|
| multiplier | -0.20 | 1.3→1.1 | 1.1 | ✅ |
| exp | +5 | 60→65 | 65 | ✅ |
| str_stat | -1 | 10→9 | 9 | ✅ |
| streak | =0 | 3→0 | 0 | ✅ |
| vit_stat | unchanged | 13 | 13 | ✅ |
| int_stat | unchanged | 11 | 11 | ✅ |

### Budget scaling check:
| Day | Multiplier | Formula | Expected | Actual | Pass? |
|-----|-----------|---------|----------|--------|-------|
| 1 | 1.00 | int(120×1.00) | 120 | 120 | ✅ |
| 3 | 1.20 | int(120×1.20) | 144 | 130* | ⚠️ |
| 4 | 1.30 | int(120×1.30) | 156 | 150* | ⚠️ |
| 5 | 1.10 | int(120×1.10) | 132 | 125* | ⚠️ |

*LLM-generated task sums within ±10% tolerance window — **all within spec**.

---

## Test Case Results

| Test | Scenario | Status | Notes |
|------|----------|--------|-------|
| TC-L01 | POWER_UP × 3 accumulation | ✅ PASS | All deltas correct |
| TC-L02 | INT boost at streak=3 | ✅ PASS | Day 3 and Day 7 both triggered |
| TC-L03 | PENALTY (ECR=0%) | ✅ PASS | All resets correct, floors not needed |
| TC-L04 | STABLE (65–84%) | ❌ NOT ACHIEVED | Skip-first strategy gave 96% ECR → POWER_UP |
| TC-L05 | Recovery after PENALTY | ✅ PASS | Streak rebuilt correctly; INT boost recurred at streak=3 |
| TC-L06 | Budget scales with multiplier | ✅ PASS | All within ±10% tolerance |
| TC-L07 | Fallback plan mechanism | ✅ PASS | Activated on Days 2, 6, 7 cleanly |
| TC-L08 | Arc Day → Phase detection | ✅ PASS | Days 1–5 = CALIBRATE, Days 6–7 = CHALLENGING |

---

## Bugs Found This Session

| ID | Severity | Description | Status |
|----|----------|-------------|--------|
| BUG-07 | Low | `[FALLBACK]` prefix compounds on consecutive fallback days | ✅ Fixed |

---

## Observations & Follow-Up Items

### OBS-01: STABLE scenario not tested (TC-L04 failed to trigger)
**What happened:** Skipping the first task (5 mins out of 125-min budget) gave ECR = 120/125 = 96% → POWER_UP.  
**Root cause:** CALIBRATE phase generates a very short warmup task (5 min) — skipping it loses only 4% of budget, not enough to drop below 85%.  
**Fix for next test:** To reach STABLE (65–84%), need to complete tasks summing to ~81–105 mins out of 125. Recommended strategy: complete only the first 2 tasks (35 mins), which is ~28% → PENALTY. OR: use `PATCH /v1/daily-plan/task/{id}` to `DELETE` a major task (reduce denominator) before end-day, then complete all remaining.  
**Priority:** High — STABLE is an untested code path in `math_stats.py`.

### OBS-02: Gemini rate limiting hits ~every other day
**What happened:** Days 2, 6, 7 used fallback plans due to Gemini free-tier RPM/RPD quota exhaustion.  
**Impact:** Fallback plans repeat yesterday's tasks, stalling player progression. Budget shown matches previous day (not current multiplier), though this is by design for the emergency fallback.  
**Recommendation:** Before production, implement exponential backoff retry (currently 3 retries with no delay). Also consider Gemini Batch API for the batch pipeline to avoid per-request rate limits.

### OBS-03: Budget floors not tested
The `difficulty_multiplier` floor of 0.10 was not triggered in this run (lowest was 1.10 after PENALTY from 1.30). A future test starting with mult=0.30 and triggering consecutive PENALTY events would test this floor.

### OBS-04: STR floor not tested
`str_stat` dropped from 10 → 9 in Day 4. The spec floor is 1. A future test with 10+ consecutive PENALTY days from str=1 would test this.

### OBS-05: Phase transition visible at Day 6
Arc Day 6 triggered **CHALLENGING** phase (Days 6–20 per spec). Confirmed via `GET /dev/thinking/preview-prompt`. Task generation was fallback so the CHALLENGING prompt wasn't exercised by Gemini this session — not separately verified.

---

## Final Player State After 7 Days

```
Level: 1
EXP:   125
STR:   9   (was 10, lost 1 from Day 4 PENALTY)
INT:   12  (was 10, gained +1 at Day 3 streak=3, +1 at Day 7 streak=3)
VIT:   16  (gained +1 each POWER_UP day: 6 POWER_UP events)
Streak: 3
Multiplier: 1.4 (starts 1.0 → net +6×0.10 -1×0.20 = +0.40)
```

The player is noticeably stronger than Day 1 despite one PENALTY day — demonstrating the intended risk-reward balance of the stat system.

---

## Environment
```
Python:       3.13.x
FastAPI:      0.122.0
google-genai: 2.4.0
Model:        gemini-2.5-flash-lite
Gemini calls: 4 successful, 3 rate-limited (fallback)
Simulation:   arc_start_date overridden to 2026-05-15 via PUT /dev/user/1/set-arc-start
```
