"""
Shared arc/phase utilities used by both thinking and learning pipelines.

Neither thinking/ nor learning/ should import from each other.
Both import from here instead.
"""
from datetime import date


PHASE_INSTRUCTIONS: dict[str, str] = {
    "CALIBRATE": (
        "The system is initializing. Lower cognitive friction. Prioritize hyper-actionable, "
        "low-barrier Starter tasks (<5 mins) to build momentum. Keep total budget restricted."
    ),
    "CHALLENGING": (
        "The system is entering peak conflict mode. Escalate difficulty. Enforce dense, "
        "high-load Deep Work tasks. Force user into aggressive skill acquisition boundaries."
    ),
    "ROUTINE": (
        "The system is stabilizing into habits. Maintain steady load. Balance tasks evenly. "
        "If day equals 30, activate Judgment Day protocol: swap standard task array for exactly "
        "ONE comprehensive evaluation challenge task."
    ),
}


def compute_arc_day_index(arc_start_date: str, reference_date: str | None = None) -> int:
    start = date.fromisoformat(arc_start_date)
    ref = date.fromisoformat(reference_date) if reference_date else date.today()
    return (ref - start).days + 1


def compute_task_budget(difficulty_multiplier: float) -> int:
    return int(120 * difficulty_multiplier)


def get_phase(arc_day_index: int) -> tuple[str, str]:
    if 1 <= arc_day_index <= 5:
        phase = "CALIBRATE"
    elif 6 <= arc_day_index <= 20:
        phase = "CHALLENGING"
    else:
        phase = "ROUTINE"
    return phase, PHASE_INSTRUCTIONS[phase]
