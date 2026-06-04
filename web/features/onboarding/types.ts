export interface Milestone {
  week_number: number;
  objective: string;
}

export interface OnboardResult {
  user_id: string;
  message: string;
  active_arc: {
    arc_name: string;
    milestones: Milestone[];
  };
}

export type OnboardingStep = "goal" | "questions" | "loading" | "success";
