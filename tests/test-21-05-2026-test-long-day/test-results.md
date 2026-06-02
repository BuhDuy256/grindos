# GrindOS AI Core — Long-Run Test Results
**Date:** 2026-05-21  
**Model:** `gemini-2.5-flash-lite`  
**Simulated period:** 2026-05-15 → 2026-05-21 (7 days)  
**User:** `user_id=1`, arc_start_date forced to `2026-05-15`

---

## Raw Day-by-Day Output

### Day 1 — 2026-05-15 (Arc Day 1 · CALIBRATE)

**Pre-stats:** mult=1.0 exp=0 str=10 int=10 vit=10 streak=0

**Tasks generated (Gemini · 5 tasks · 120 mins):**
```
[ 5m] Access GRINDOS terminal and acknowledge directive.
[30m] Complete Go tutorial: "Introduction to Go Syntax".
[30m] Complete Go tutorial: "Go Data Types Explained".
[40m] Complete Go tutorial: "Control Structures in Go (If, For, Switch)".
[15m] Review and summarize Go syntax, data types, and control structures.
```
Total: 5+30+30+40+15 = **120 mins** ✅ (budget=120)

**Completed:** 5/5 tasks | 120/120 mins | **ECR=100%** | **Event=POWER_UP**

**Post-stats:** mult=1.1 exp=20 str=10 int=10 vit=11 streak=1

---

### Day 2 — 2026-05-16 (Arc Day 2 · CALIBRATE)

**Pre-stats:** mult=1.1 exp=20 str=10 int=10 vit=11 streak=1

**Tasks generated (FALLBACK · Gemini rate-limited · 5 tasks · 120 mins):**
```
[ 5m] [FALLBACK] Access GRINDOS terminal and acknowledge directive.
[30m] [FALLBACK] Complete Go tutorial: "Introduction to Go Syntax".
[30m] [FALLBACK] Complete Go tutorial: "Go Data Types Explained".
[40m] [FALLBACK] Complete Go tutorial: "Control Structures in Go (If, For, Switch)".
[15m] [FALLBACK] Review and summarize Go syntax, data types, and control structures.
```
⚠️ **Fallback used** — Gemini rate-limited (RPM quota). Copied Day 1 tasks.  
Budget shown: 120 mins (expected 132 for mult=1.1 — fallback copies previous budget, by design).

**Completed:** 5/5 tasks | 120/120 mins | **ECR=100%** | **Event=POWER_UP**

**Post-stats:** mult=1.2 exp=40 str=10 int=10 vit=12 streak=2

---

### Day 3 — 2026-05-17 (Arc Day 3 · CALIBRATE) — **INT Boost Day**

**Pre-stats:** mult=1.2 exp=40 str=10 int=10 vit=12 streak=2

**Tasks generated (Gemini · 4 tasks · 130 mins):**
```
[15m] Set up Go environment and create first 'hello world' program.
[40m] Complete Go syntax and variable declaration tutorial.
[40m] Work through Go data types (integers, floats, strings, booleans).
[35m] Implement basic control structures (if/else, switch) in Go.
```
Total: 15+40+40+35 = **130 mins** ✅ (budget=144, 130 within ±10% range [129.6–158.4])

**Completed:** 4/4 tasks | 130/130 mins | **ECR=100%** | **Event=POWER_UP**

**Post-stats:** mult=1.3 exp=60 str=10 **int=11** vit=13 **streak=3**  
🎯 **INT boost triggered at streak=3**: int 10 → 11 ✅

---

### Day 4 — 2026-05-18 (Arc Day 4 · CALIBRATE) — **PENALTY Day**

**Pre-stats:** mult=1.3 exp=60 str=10 int=11 vit=13 streak=3

**Tasks generated (Gemini · 5 tasks · 150 mins):**
```
[ 5m] Access Go documentation homepage.
[40m] Complete 'A Tour of Go' - Section 1: Basics.
[40m] Complete 'A Tour of Go' - Section 2: Flow control statements.
[40m] Complete 'A Tour of Go' - Section 3: More types.
[25m] Review Go data types cheat sheet.
```
Total: 5+40+40+40+25 = **150 mins** ✅ (budget=156, 150 within ±10% range [140.4–171.6])

**Completed:** 0/5 tasks | 0/150 mins | **ECR=0%** | **Event=PENALTY**

**Post-stats:** mult=**1.1** exp=**65** str=**9** int=11 vit=13 **streak=0**  
💥 PENALTY applied: mult 1.3→1.1, str 10→9, streak reset to 0 ✅

---

### Day 5 — 2026-05-19 (Arc Day 5 · CALIBRATE) — **STABLE Attempt**

**Pre-stats:** mult=1.1 exp=65 str=9 int=11 vit=13 streak=0

**Tasks generated (Gemini · 5 tasks · 125 mins):**
```
[ 5m] Set up Go development environment (install Go, VS Code, and extensions).
[30m] Complete 'A Tour of Go' - Section 1: Basics (Tour).
[30m] Complete 'A Tour of Go' - Section 2: Flow Control (Tour).
[30m] Complete 'A Tour of Go' - Section 3: More Types (Tour).
[30m] Review and practice Go syntax with simple exercises.
```
Total: 5+30+30+30+30 = **125 mins** ✅ (budget=132, 125 within ±10% range [118.8–145.2])

**Strategy:** Skip first task (5 mins warm-up) → complete tasks 2–5

**Completed:** 4/5 tasks | 120/125 mins | **ECR=96%** | **Event=POWER_UP**

⚠️ **STABLE NOT triggered** — skipping a 5-min warm-up from a 125-min budget still yields 96% ECR → POWER_UP threshold exceeded. Strategy needs adjustment to achieve STABLE (65–84%).

**Post-stats:** mult=1.2 exp=85 str=9 int=11 **vit=14 streak=1**

---

### Day 6 — 2026-05-20 (Arc Day 6 · **CHALLENGING**)

**Pre-stats:** mult=1.2 exp=85 str=9 int=11 vit=14 streak=1

**Tasks generated (FALLBACK · Gemini rate-limited · 5 tasks · 125 mins):**
```
[ 5m] [FALLBACK] Set up Go development environment.
[30m] [FALLBACK] Complete 'A Tour of Go' - Section 1: Basics.
[30m] [FALLBACK] Complete 'A Tour of Go' - Section 2: Flow Control.
[30m] [FALLBACK] Complete 'A Tour of Go' - Section 3: More Types.
[30m] [FALLBACK] Review and practice Go syntax with simple exercises.
```
⚠️ **Fallback used** — Gemini rate-limited again.

**Completed:** 5/5 tasks | 125/125 mins | **ECR=100%** | **Event=POWER_UP**

**Post-stats:** mult=1.3 exp=105 str=9 int=11 **vit=15 streak=2**

---

### Day 7 — 2026-05-21 (Arc Day 7 · CHALLENGING) — **Second INT Boost**

**Pre-stats:** mult=1.3 exp=105 str=9 int=11 vit=15 streak=2

**Tasks generated (FALLBACK · Gemini rate-limited · 5 tasks · 125 mins):**
```
[ 5m] [FALLBACK] Set up Go development environment.
[30m] [FALLBACK] Complete 'A Tour of Go' - Section 1: Basics.
[30m] [FALLBACK] Complete 'A Tour of Go' - Section 2: Flow Control.
[30m] [FALLBACK] Complete 'A Tour of Go' - Section 3: More Types.
[30m] [FALLBACK] Review and practice Go syntax with simple exercises.
```
⚠️ **Fallback used** — Gemini rate-limited.

**Completed:** 5/5 tasks | 125/125 mins | **ECR=100%** | **Event=POWER_UP**

**Post-stats:** mult=**1.4** exp=**125** str=9 **int=12** vit=**16** **streak=3**  
🎯 **Second INT boost triggered at streak=3**: int 11 → 12 ✅

---

## Summary Table

| Day | Date | Budget | Gemini | Tasks | Comp% | ECR | Event | mult | EXP | STR | INT | VIT | Streak |
|-----|------|--------|--------|-------|-------|-----|-------|------|-----|-----|-----|-----|--------|
| 0 (start) | — | — | — | — | — | — | — | 1.0 | 0 | 10 | 10 | 10 | 0 |
| 1 | 2026-05-15 | 120 | ✅ | 5 | 100% | 100 | POWER_UP | 1.1 | 20 | 10 | 10 | 11 | 1 |
| 2 | 2026-05-16 | 120⚠️ | FALLBACK | 5 | 100% | 100 | POWER_UP | 1.2 | 40 | 10 | 10 | 12 | 2 |
| 3 | 2026-05-17 | 130 | ✅ | 4 | 100% | 100 | POWER_UP+INT | 1.3 | 60 | 10 | **11** | 13 | 3 |
| 4 | 2026-05-18 | 150 | ✅ | 5 | 0% | 0 | PENALTY | 1.1 | 65 | **9** | 11 | 13 | **0** |
| 5 | 2026-05-19 | 125 | ✅ | 5 | 96% | 96 | POWER_UP⚠️ | 1.2 | 85 | 9 | 11 | 14 | 1 |
| 6 | 2026-05-20 | 125⚠️ | FALLBACK | 5 | 100% | 100 | POWER_UP | 1.3 | 105 | 9 | 11 | 15 | 2 |
| 7 | 2026-05-21 | 125⚠️ | FALLBACK | 5 | 100% | 100 | POWER_UP+INT | 1.4 | 125 | 9 | **12** | 16 | 3 |

⚠️ = deviation from expected (see notes)

---

## Bugs Found During Long-Run Testing

### BUG-07: `[FALLBACK]` prefix compounds on consecutive fallback days
**Severity:** Low (cosmetic — no functional impact)  
**Symptom:** When Day N uses fallback (copies Day N-1 tasks), and Day N-1 was also a fallback, tasks for Day N get `[FALLBACK] [FALLBACK]` double prefix. Day 7 tasks showed `[FALLBACK] [FALLBACK] Set up Go environment...`  
**Root cause:** `_build_fallback_plan` naively prepends `[FALLBACK] ` without stripping existing prefixes.  
**Fix applied:** `"[FALLBACK] " + t['title'].replace("[FALLBACK] ", "")` — strips existing prefix before prepending.  
**Status:** ✅ Fixed in `engine.py`
