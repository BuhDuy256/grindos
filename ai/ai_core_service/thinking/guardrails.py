from typing import Literal, Optional
from pydantic import BaseModel, field_validator


class TaskOutput(BaseModel):
    title: str
    duration_mins: int
    parent_id: Optional[int] = None
    origin_type: Literal["SYSTEM_GENERATED"] = "SYSTEM_GENERATED"

    @field_validator("duration_mins")
    @classmethod
    def must_be_multiple_of_five(cls, v: int) -> int:
        if v % 5 != 0:
            raise ValueError(f"duration_mins must be a multiple of 5, got {v}")
        return v


class DailyPlanOutput(BaseModel):
    system_message: str
    progress_analysis: str
    tasks: list[TaskOutput]


class MilestoneItem(BaseModel):
    week_number: int
    objective: str


class ArcForgeOutput(BaseModel):
    arc_name: str
    milestones: list[MilestoneItem]


class ArcChoice(BaseModel):
    choice_id: str
    title: str
    description: str
    new_arc_name: str
    new_arc_milestones: list[MilestoneItem]


class ArcBridgeOutput(BaseModel):
    summary_assessment: str
    user_persona_summary: str
    choices: list[ArcChoice]


def validate_plan_output(data: dict, task_budget: int) -> DailyPlanOutput:
    plan = DailyPlanOutput(**data)
    total_mins = sum(t.duration_mins for t in plan.tasks)
    lower = task_budget * 0.9
    upper = task_budget * 1.1
    if not (lower <= total_mins <= upper):
        raise ValueError(
            f"Task budget violation: total={total_mins} mins, budget={task_budget} (±10% window: {lower:.0f}–{upper:.0f})"
        )
    return plan
