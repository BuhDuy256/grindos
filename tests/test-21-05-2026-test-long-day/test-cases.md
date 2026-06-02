# GrindOS AI Core — Long-Run Test Cases
**Date:** 2026-05-21

---

## TC-L01: POWER_UP Stat Accumulation (Days 1–3)
**Goal:** Verify three consecutive POWER_UP events accumulate stats correctly.

For each day (1, 2, 3):
1. Run thinking pipeline: `POST /dev/thinking/run-for-user {"user_id":1,"date":"<day_date>"}`
2. Fetch plan: `GET /v1/daily-plan?user_id=1&date=<day_date>`
3. Complete ALL tasks: `POST /v1/daily-plan/end-day` with all task IDs
4. Run learning: `POST /dev/learning/run-for-user {"user_id":1,"date":"<day_date>"}`
5. Check profile: `GET /v1/player/profile?user_id=1`

**Expected per POWER_UP event:**
- `difficulty_multiplier += 0.10`
- `exp += 20`
- `vit_stat += 1`
- `streak += 1`
- `int_stat += 1` only when `streak` reaches 3 (Day 3)
- `str_stat` unchanged

---

## TC-L02: INT Boost at Streak = 3
**Goal:** Verify INT bonus fires exactly at streak = 3, not before.

- Day 2 end: streak = 2 → INT must NOT increase
- Day 3 end: streak = 3 → INT MUST increase by 1

---

## TC-L03: PENALTY — Streak Reset + Multiplier Drop (Day 4)
**Goal:** Verify PENALTY fires when ECR = 0% and all boundary conditions hold.

Steps:
1. Run thinking pipeline for 2026-05-18
2. Submit end-day with `completed_task_ids: []` (zero tasks completed)
3. Run learning pipeline
4. Check profile

**Expected:**
- `ecr = 0%`, `event = PENALTY`
- `difficulty_multiplier -= 0.20` (from Day 3 end value of 1.30 → 1.10)
- `exp += 5`
- `str_stat -= 1` (from 10 → 9)
- `streak = 0` (hard reset, not decrement)
- `vit_stat` unchanged
- `int_stat` unchanged

---

## TC-L04: STABLE — No Stat Change (Day 5)
**Goal:** Verify STABLE event (65% ≤ ECR ≤ 84%) produces exactly zero stat changes.

Strategy: Complete all tasks except the first (short warm-up), aiming for ~70–75% ECR.

**Expected:**
- `event = STABLE`
- ALL stats unchanged from Day 4 post-state
- `streak` unchanged (STABLE does NOT increment OR reset streak)

**Note:** ECR depends on Gemini-generated task distribution. If warm-up task is < 5% of budget, ECR of remaining tasks ≥ 95% → POWER_UP instead of STABLE. See TC-L04 results for actual outcome.

---

## TC-L05: Recovery After Penalty (Days 6–7)
**Goal:** Verify POWER_UP events fire normally after PENALTY, and INT boost re-triggers when streak = 3 again.

Steps (Days 6 and 7): Complete ALL tasks each day.

**Expected:**
- Day 6: POWER_UP, streak = 1 (not 4 — streak was reset to 0 by PENALTY)
- Day 7: POWER_UP, streak = 2
- INT does NOT boost on Day 7 since streak = 2 < 3

---

## TC-L06: Task Budget Scales with Multiplier
**Goal:** Verify morning task budget = `int(120 × difficulty_multiplier)` from previous day.

Check that budget grows correctly:
- Day 1 budget = int(120 × 1.00) = 120
- Day 2 budget = int(120 × 1.10) = 132
- Day 3 budget = int(120 × 1.20) = 144
- Day 4 budget = int(120 × 1.30) = 156 (highest, streak=3)
- Day 5 budget = int(120 × 1.10) = 132 (after PENALTY)

---

## TC-L07: Fallback Plan Mechanism
**Goal:** Verify the fallback plan activates cleanly when Gemini fails and does NOT crash the pipeline.

Fallback triggers when:
- Gemini returns non-JSON or fails validation after 3 repair attempts
- Gemini returns 429/503 rate-limit or service error

**Expected fallback behavior:**
- `daily_plans` row created for the date
- Tasks copied from yesterday's plan with `[FALLBACK]` prefix
- `origin_type = "SYSTEM_GENERATED"` preserved
- Pipeline returns `"ok"` status (no crash)
- Fallback prefix does NOT compound on repeat fallbacks (`[FALLBACK] [FALLBACK]...` is a bug)

---

## TC-L08: Arc Day Index Phase Detection
**Goal:** Verify phase (CALIBRATE / CHALLENGING / ROUTINE) maps correctly to arc day index.

Expected (arc_start_date = 2026-05-15):
| Simulated Date | Arc Day | Expected Phase |
|----------------|---------|----------------|
| 2026-05-15 | 1 | CALIBRATE |
| 2026-05-16 | 2 | CALIBRATE |
| 2026-05-17 | 3 | CALIBRATE |
| 2026-05-18 | 4 | CALIBRATE |
| 2026-05-19 | 5 | CALIBRATE |
| 2026-05-20 | 6 | **CHALLENGING** |
| 2026-05-21 | 7 | CHALLENGING |
