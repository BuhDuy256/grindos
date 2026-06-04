export interface Task {
  id: string;
  plan_id: string;
  parent_id: string | null;
  title: string;
  description: string | null;
  duration_mins: number;
  is_completed: boolean;
  modification_state: string;
  subtasks?: Task[];
  focus_time_seconds?: number;
}

export interface DailyPlan {
  id: string;
  date: string;
  system_message: string | null;
  progress_analysis: string | null;
  ecr_score: number | null;
  user_note: string | null;
  tasks: Task[];
}
