"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { TaskList, type Task } from "@/features/daily-plan/TaskList";
import { useActiveUser } from "@/features/user/useActiveUser";

interface DailyPlan {
  id: number;
  date: string;
  system_message: string | null;
  progress_analysis: string | null;
  ecr_score: number | null;
  user_note: string | null;
  tasks: Task[];
}

export default function DailyPlanPage() {
  const today = new Date().toLocaleDateString("en-CA");
  const { userId: USER_ID } = useActiveUser();
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");
  const [noteSaved, setNoteSaved] = useState(false);
  const [noteSaving, setNoteSaving] = useState(false);

  useEffect(() => {
    apiClient
      .get<DailyPlan>(`/v1/daily-plan?user_id=${USER_ID}&date=${today}`)
      .then((res) => {
        if (!res.error) {
          setPlan(res.data);
          setNote(res.data.user_note ?? "");
        }
      })
      .finally(() => setLoading(false));
  }, [today]);

  async function saveNote() {
    setNoteSaving(true);
    await apiClient.post("/v1/daily-plan/end-day", {
      user_id: USER_ID,
      date: today,
      user_note: note,
    });
    setNoteSaving(false);
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2000);
  }

  if (loading) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-sm text-zinc-400">Loading...</p>
      </main>
    );
  }

  if (!plan) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-zinc-500 text-sm">
          No plan for today. Go to{" "}
          <a href="/admin" className="text-violet-600 underline">Admin</a>{" "}
          and click <strong>Run Thinking</strong>.
        </p>
      </main>
    );
  }

  const totalMins = plan.tasks.reduce((s, t) => s + t.duration_mins, 0);
  const completedCount = plan.tasks.filter((t) => t.is_completed).length;

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <p className="text-sm text-zinc-500 mb-1">{plan.date}</p>
      <h1 className="text-2xl font-bold tracking-tight mb-4">Daily Plan</h1>

      {plan.system_message && (
        <div className="mb-5 rounded-lg border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-800 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-300">
          {plan.system_message}
        </div>
      )}

      <div className="mb-5 flex gap-5 text-sm text-zinc-500">
        <span>{plan.tasks.length} tasks</span>
        <span>{totalMins} min total</span>
        <span>{completedCount} completed</span>
        {plan.ecr_score !== null && (
          <span className="font-medium text-violet-600">ECR {plan.ecr_score}%</span>
        )}
      </div>

      <TaskList tasks={plan.tasks} planID={plan.id} />

      {plan.progress_analysis && (
        <div className="mt-8 text-sm text-zinc-600 dark:text-zinc-400 border-t border-zinc-100 dark:border-zinc-800 pt-6">
          <p className="font-medium text-zinc-700 dark:text-zinc-300 mb-1">AI Analysis</p>
          <p>{plan.progress_analysis}</p>
        </div>
      )}

      <div className="mt-8 border-t border-zinc-100 dark:border-zinc-800 pt-6">
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
          End-of-day note
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="How did today go? Any blockers?"
          className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
        <button
          onClick={saveNote}
          disabled={noteSaving}
          className="mt-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50 transition-colors"
        >
          {noteSaving ? "Saving..." : noteSaved ? "Saved ✓" : "Save note"}
        </button>
      </div>
    </main>
  );
}
