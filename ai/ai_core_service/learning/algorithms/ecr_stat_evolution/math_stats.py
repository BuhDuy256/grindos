def compute_ecr(completed_mins: int, total_mins: int) -> float:
    if total_mins == 0:
        return 0.0
    return (completed_mins / total_mins) * 100


def apply_stat_evolution(stats: dict, ecr: float) -> tuple[dict, str]:
    updated = dict(stats)

    if ecr >= 85:
        updated["difficulty_multiplier"] = round(updated["difficulty_multiplier"] + 0.10, 2)
        updated["exp"] += 20
        updated["vit_stat"] += 1
        updated["streak"] += 1
        if updated["streak"] >= 3:
            updated["int_stat"] += 1
        event = "POWER_UP"
    elif ecr >= 65:
        event = "STABLE"
    else:
        updated["difficulty_multiplier"] = round(updated["difficulty_multiplier"] - 0.20, 2)
        updated["exp"] += 5
        updated["str_stat"] -= 1
        updated["streak"] = 0
        event = "PENALTY"

    # Boundary floors
    updated["difficulty_multiplier"] = max(0.10, updated["difficulty_multiplier"])
    updated["str_stat"] = max(1, updated["str_stat"])
    updated["int_stat"] = max(1, updated["int_stat"])

    return updated, event
