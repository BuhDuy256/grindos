from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class AlgoInput:
    user_id: int
    date: str
    plan: dict
    tasks: list[dict]  # flat list, includes DELETED tasks
    stats: dict
    ai_context: dict


class BaseAlgorithm(ABC):
    name: str  # must match folder name under algorithms/

    @abstractmethod
    def run(self, input: AlgoInput) -> dict:
        """Compute and return result dict. Never writes to DB directly."""
        ...
