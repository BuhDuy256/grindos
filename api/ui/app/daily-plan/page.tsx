"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { TaskList, type Task } from "@/features/daily-plan/TaskList";
import { useAuth } from "@/hooks/useAuth";

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
  const { user, loading: authLoading } = useAuth();
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");
  const [noteSaved, setNoteSaved] = useState(false);
  const [noteSaving, setNoteSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    apiClient
      .get<DailyPlan>(`/v1/daily-plan?user_id=${user.id}&date=${today}`)
      .then((res) => {
        if (!res.error) {
          setPlan(res.data);
          setNote(res.data.user_note ?? "");
        }
      })
      .finally(() => setLoading(false));
  }, [user, today]);

  async function saveNote() {
    if (!user) return;
    setNoteSaving(true);
    await apiClient.post("/v1/daily-plan/end-day", {
      user_id: user.id,
      date: today,
      user_note: note,
    });
    setNoteSaving(false);
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2000);
  }

  if (authLoading || loading) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-sm" style={{ color: "var(--muted)" }}>Loading...</p>
      </main>
    );
  }

  if (!plan) {
    return (
      <main className="flex flex-1 items-center justify-center px-4 text-center">
        <div>
          <p className="text-sm mb-2" style={{ color: "var(--muted)" }}>No plan for today.</p>
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            Ask an admin to run Thinking for your account.
          </p>
        </div>
      </main>
    );
  }

  const totalMins = plan.tasks.reduce((s, t) => s + t.duration_mins, 0);
  const completedCount = plan.tasks.filter((t) => t.is_completed).length;

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <p className="text-sm mb-1" style={{ color: "var(--muted)" }}>{plan.date}</p>
      <h1 className="text-2xl font-bold tracking-tight mb-4">Daily Plan</h1>

      {plan.system_message && (
        <div
          className="mb-5 rounded-xl border px-4 py-3 text-sm"
          style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--fg)" }}
        >
          {plan.system_message}
        </div>
      )}

      <div className="mb-5 flex gap-4 text-sm flex-wrap" style={{ color: "var(--muted)" }}>
        <span>{plan.tasks.length} tasks</span>
        <span>{totalMins} min</span>
        <span>{completedCount}/{plan.tasks.length} done</span>
        {plan.ecr_score !== null && (
          <span className="font-semibold" style={{ color: "var(--accent)" }}>ECR {plan.ecr_score}%</span>
        )}
      </div>

      <TaskList tasks={plan.tasks} planID={plan.id} />

      {plan.progress_analysis && (
        <div
          className="mt-8 text-sm border-t pt-6"
          style={{ borderColor: "var(--border)", color: "var(--muted)" }}
        >
          <p className="font-medium mb-1" style={{ color: "var(--fg)" }}>AI Analysis</p>
          <p>{plan.progress_analysis}</p>
        </div>
      )}

      <div className="mt-8 border-t pt-6" style={{ borderColor: "var(--border)" }}>
        <label className="block text-sm font-medium mb-2">End-of-day note</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="How did today go? Any blockers?"
          className="w-full rounded-xl border px-3 py-2 text-sm outline-none resize-none"
          style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--fg)" }}
        />
        <button
          onClick={saveNote}
          disabled={noteSaving}
          className="mt-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-opacity disabled:opacity-50"
          style={{ background: "var(--accent)" }}
        >
          {noteSaving ? "Saving..." : noteSaved ? "Saved ✓" : "Save note"}
        </button>
      </div>
    </main>
  );
}
