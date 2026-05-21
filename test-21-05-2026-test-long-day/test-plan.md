# GrindOS AI Core — Long-Run Evolution Test Plan
**Date:** 2026-05-21  
**Session type:** Multi-day stat evolution simulation  
**Duration:** 7 simulated days (2026-05-15 → 2026-05-21)  
**Tester:** Claude Sonnet 4.6 + Le-Anh-Duy

---

## Objective

Validate that the GrindOS stat evolution system behaves correctly over an extended play session, specifically testing:

1. **POWER_UP** events accumulate stats correctly across consecutive days
2. **INT boost** fires at the correct streak threshold (streak ≥ 3)
3. **PENALTY** resets streak and reduces multiplier correctly
4. **Multiplier scaling** drives increasing task budgets each morning
5. **Boundary floors** (multiplier ≥ 0.10, STR/INT ≥ 1) are enforced
6. **Fallback plan** mechanism activates on Gemini failure and recovers cleanly

---

## Designed Scenario

| Day | Date | Strategy | Intended ECR | Intended Event |
|-----|------|----------|--------------|----------------|
| 1 | 2026-05-15 | Complete ALL tasks | 100% | POWER_UP |
| 2 | 2026-05-16 | Complete ALL tasks | 100% | POWER_UP |
| 3 | 2026-05-17 | Complete ALL tasks | 100% | **POWER_UP + INT boost** (streak=3) |
| 4 | 2026-05-18 | Complete NO tasks | 0% | **PENALTY** (streak reset, STR-1, mult-0.20) |
| 5 | 2026-05-19 | Skip first task | ~70% | STABLE (65-84%) |
| 6 | 2026-05-20 | Complete ALL tasks | 100% | POWER_UP |
| 7 | 2026-05-21 | Complete ALL tasks | 100% | **POWER_UP + INT boost** (streak=3 again) |

---

## Infrastructure Changes Needed

The base code only supported `date.today()` for pipeline execution. Multi-day simulation required:

1. **`engine.py`** — `compute_arc_day_index(arc_start_date, reference_date=None)` — added optional `reference_date` so pipeline computes arc day index relative to the simulated date rather than today.

2. **`engine.py`** — `run_thinking_for_user(user_id, target_date=None)` — added `target_date` parameter, passes it to `compute_arc_day_index`.

3. **`orchestrator.py`** — Updated `compute_arc_day_index` call to pass `target_date`.

4. **`dev_endpoints.py`** — `POST /dev/thinking/run-for-user` now forwards `req.date` to engine.

5. **`dev_endpoints.py`** — New endpoint `PUT /dev/user/{id}/set-arc-start` — overrides `arc_start_date` in `ai_contexts.metadata` to enable simulation from any starting date.

---

## Pre-Simulation Checklist

- [x] Fresh DB (`grindos.db` deleted before run)
- [x] Forge user (`user_id=1`), Arc I generated
- [x] `arc_start_date` updated to `2026-05-15` via `PUT /dev/user/1/set-arc-start`
- [x] Server restarted to pick up code changes
- [x] 2-second delay between days to respect Gemini RPM free-tier limits

---

## Expected Stat Progression

*(Theoretical — based on multiplier from previous day's end state)*

| Day | Budget | Expected Event | mult | EXP | STR | INT | VIT | Streak |
|-----|--------|---------------|------|-----|-----|-----|-----|--------|
| 0 (start) | — | — | 1.00 | 0 | 10 | 10 | 10 | 0 |
| 1 | 120 | POWER_UP | 1.10 | 20 | 10 | 10 | 11 | 1 |
| 2 | 132 | POWER_UP | 1.20 | 40 | 10 | 10 | 12 | 2 |
| 3 | 144 | POWER_UP + INT | 1.30 | 60 | 10 | **11** | 13 | 3 |
| 4 | 156 | PENALTY | 1.10 | 65 | **9** | 11 | 13 | **0** |
| 5 | 132 | STABLE | 1.10 | 65 | 9 | 11 | 13 | 0 |
| 6 | 132 | POWER_UP | 1.20 | 85 | 9 | 11 | 14 | 1 |
| 7 | 144 | POWER_UP | 1.30 | 105 | 9 | 11 | 15 | 2 |
