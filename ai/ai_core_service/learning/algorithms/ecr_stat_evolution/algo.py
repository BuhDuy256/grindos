from ai_core_service.learning.algorithms.base import AlgoInput, BaseAlgorithm
from ai_core_service.learning.algorithms.ecr_stat_evolution.math_stats import (
    apply_stat_evolution,
    compute_ecr,
)


class EcrStatEvolutionAlgo(BaseAlgorithm):
    name = "ecr_stat_evolution"

    def run(self, input: AlgoInput) -> dict:
        active = [t for t in input.tasks if t["modification_state"] != "DELETED"]
        completed_mins = sum(t["duration_mins"] for t in active if t["is_completed"])
        total_mins = sum(t["duration_mins"] for t in active)
        ecr = compute_ecr(completed_mins, total_mins)
        updated_stats, event = apply_stat_evolution(input.stats, ecr)
        return {
            "ecr": ecr,
            "ecr_int": round(ecr),
            "event": event,
            "updated_stats": updated_stats,
            "completed_mins": completed_mins,
            "total_mins": total_mins,
        }
