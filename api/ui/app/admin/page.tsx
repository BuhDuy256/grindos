"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { TaskList, type Task } from "@/features/daily-plan/TaskList";
import { useActiveUser } from "@/features/user/useActiveUser";
import { UserSwitcher } from "@/features/user/UserSwitcher";
import { getUser } from "@/lib/auth";

interface PlayerStats {
  user_id: number;
  level: number;
  exp: number;
  str_stat: number;
  int_stat: number;
  vit_stat: number;
  streak: number;
  difficulty_multiplier: number;
}

interface DailyPlan {
  id: number;
  date: string;
  system_message: string | null;
  ecr_score: number | null;
  user_note: string | null;
  tasks: Task[];
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toLocaleDateString("en-CA");
}

function StatBox({
  label,
  value,
  delta,
}: {
  label: string;
  value: string | number;
  delta?: number;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 px-4 py-3 text-center">
      <p className="text-xs text-zinc-500 uppercase tracking-wide">{label}</p>
      <p className="text-xl font-bold mt-1">{value}</p>
      {delta !== undefined && delta !== 0 && (
        <p className={`text-xs mt-0.5 font-medium ${delta > 0 ? "text-green-500" : "text-red-500"}`}>
          {delta > 0 ? `+${delta}` : delta}
        </p>
      )}
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const today = new Date().toLocaleDateString("en-CA");

  useEffect(() => {
    const u = getUser();
    if (!u) { router.replace("/login"); return; }
    if (!u.is_admin) { router.replace("/daily-plan"); return; }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const { userId: USER_ID, setUserId } = useActiveUser();
  const [simDate, setSimDate] = useState(today);
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [prevStats, setPrevStats] = useState<PlayerStats | null>(null);
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [thinkingMsg, setThinkingMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [learningMsg, setLearningMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [resetMsg, setResetMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [dayComplete, setDayComplete] = useState(false);
  const [note, setNote] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);

  const loadData = useCallback(async (date: string) => {
    setLoading(true);
    const [statsRes, planRes] = await Promise.all([
      apiClient.get<PlayerStats>(`/admin/player/profile?user_id=${USER_ID}`),
      apiClient.get<DailyPlan>(`/v1/daily-plan?user_id=${USER_ID}&date=${date}`),
    ]);
    if (!statsRes.error) setStats(statsRes.data);
    if (!planRes.error) {
      setPlan(planRes.data);
      setNote(planRes.data.user_note ?? "");
    } else {
      setPlan(null);
      setNote("");
    }
    setLoading(false);
    return statsRes.error ? null : statsRes.data;
  }, [USER_ID]); // re-create when user changes

  useEffect(() => {
    setStats(null);
    setPlan(null);
    setPrevStats(null);
    setThinkingMsg(null);
    setLearningMsg(null);
    setDayComplete(false);
    setNote("");
    setNoteSaved(false);
    loadData(simDate);
  }, [simDate, loadData]);

  async function saveNote() {
    if (!plan) return;
    setNoteSaving(true);
    await apiClient.post("/v1/daily-plan/end-day", {
      user_id: USER_ID,
      date: simDate,
      user_note: note,
    });
    setNoteSaving(false);
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2000);
  }

  const planExists = plan !== null;
  const learningDone = plan?.ecr_score !== null && plan?.ecr_score !== undefined;

  async function runThinking() {
    setThinkingMsg(null);
    const res = await apiClient.post("/admin/thinking/run", { user_id: USER_ID, date: simDate });
    if (res.error) {
      setThinkingMsg({ ok: false, text: `Error: ${res.error}` });
    } else {
      await loadData(simDate);
      setThinkingMsg({ ok: true, text: `Tasks generated for ${simDate}.` });
    }
  }

  async function runLearning() {
    setLearningMsg(null);
    const snapshot = stats;
    const res = await apiClient.post("/admin/learning/run", { user_id: USER_ID, date: simDate });
    if (res.error) {
      setLearningMsg({ ok: false, text: `Error: ${res.error}` });
      return;
    }
    const newStats = await loadData(simDate);
    setPrevStats(snapshot);
    const updatedPlan = await apiClient.get<DailyPlan>(`/v1/daily-plan?user_id=${USER_ID}&date=${simDate}`);
    const ecr = updatedPlan.error ? null : updatedPlan.data?.ecr_score;
    const event = ecr !== null && ecr !== undefined
      ? ecr >= 85 ? "⚡ POWER_UP" : ecr >= 65 ? "➡ STABLE" : "💀 PENALTY"
      : "";
    setLearningMsg({ ok: true, text: `ECR: ${ecr ?? "?"}% — ${event}` });
    setDayComplete(true);
    if (!updatedPlan.error) setPlan(updatedPlan.data);
    void newStats;
  }

  async function resetUser() {
    if (!confirm(`Reset user ${USER_ID} to Day 1? Wipes all plans and stats.`)) return;
    const res = await apiClient.delete(`/admin/user/${USER_ID}/reset`);
    if (res.error) {
      setResetMsg({ ok: false, text: `Error: ${res.error}` });
    } else {
      setSimDate(today);
      setStats(null);
      setPlan(null);
      setPrevStats(null);
      setDayComplete(false);
      setThinkingMsg(null);
      setLearningMsg(null);
      await loadData(today);
      setResetMsg({ ok: true, text: "Reset to Day 1." });
    }
  }

  function advanceDay() {
    setSimDate((d) => addDays(d, 1));
  }

  const completedCount = plan?.tasks.filter((t) => t.is_completed).length ?? 0;
  const totalCount = plan?.tasks.length ?? 0;

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Dev</p>
          <h1 className="text-2xl font-bold tracking-tight">Admin Panel</h1>
        </div>
        <UserSwitcher userId={USER_ID} onSwitch={setUserId} />
        <div className="text-right">
          <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Simulation date</p>
          <p className="text-lg font-mono font-bold">{simDate}</p>
          <div className="flex gap-2 mt-1 justify-end">
            <button
              onClick={() => setSimDate((d) => addDays(d, -1))}
              className="text-xs text-zinc-400 hover:text-zinc-600 px-2 py-0.5 border border-zinc-200 dark:border-zinc-700 rounded"
            >
              ← Prev
            </button>
            <button
              onClick={() => setSimDate(today)}
              className="text-xs text-zinc-400 hover:text-zinc-600 px-2 py-0.5 border border-zinc-200 dark:border-zinc-700 rounded"
            >
              Today
            </button>
            <button
              onClick={() => setSimDate((d) => addDays(d, 1))}
              className="text-xs text-zinc-400 hover:text-zinc-600 px-2 py-0.5 border border-zinc-200 dark:border-zinc-700 rounded"
            >
              Next →
            </button>
          </div>
        </div>
      </div>

      {/* Day complete banner */}
      {dayComplete && (
        <div className="mb-6 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 px-4 py-3 flex items-center justify-between">
          <p className="text-sm text-green-700 dark:text-green-300 font-medium">
            Day {simDate} complete!
          </p>
          <button
            onClick={advanceDay}
            className="text-sm font-medium bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700"
          >
            Advance to next day →
          </button>
        </div>
      )}

      {/* Player Stats */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-3">Player Stats</h2>
        {loading && !stats ? (
          <p className="text-sm text-zinc-400">Loading...</p>
        ) : stats ? (
          <div className="grid grid-cols-4 gap-2">
            <StatBox label="Level" value={stats.level} />
            <StatBox label="EXP" value={stats.exp} delta={prevStats ? stats.exp - prevStats.exp : undefined} />
            <StatBox label="Streak" value={`${stats.streak}d`} delta={prevStats ? stats.streak - prevStats.streak : undefined} />
            <StatBox label="×Multi" value={stats.difficulty_multiplier} delta={prevStats ? +(stats.difficulty_multiplier - prevStats.difficulty_multiplier).toFixed(2) : undefined} />
            <StatBox label="STR" value={stats.str_stat} delta={prevStats ? stats.str_stat - prevStats.str_stat : undefined} />
            <StatBox label="INT" value={stats.int_stat} delta={prevStats ? stats.int_stat - prevStats.int_stat : undefined} />
            <StatBox label="VIT" value={stats.vit_stat} delta={prevStats ? stats.vit_stat - prevStats.vit_stat : undefined} />
            <StatBox label="Tasks" value={plan ? `${completedCount}/${totalCount}` : "—"} />
          </div>
        ) : (
          <p className="text-sm text-zinc-500">No stats — onboard a user first.</p>
        )}
      </section>

      {/* Task List */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-3">
          Tasks
          {plan?.ecr_score !== null && plan?.ecr_score !== undefined && (
            <span className="ml-2 font-normal normal-case text-violet-600">ECR {plan.ecr_score}%</span>
          )}
        </h2>
        {plan?.system_message && (
          <p className="mb-3 text-sm text-violet-600 dark:text-violet-400">{plan.system_message}</p>
        )}
        {plan && plan.tasks.length > 0 ? (
          <TaskList tasks={plan.tasks} planID={plan.id} />
        ) : (
          <p className="text-sm text-zinc-500">No plan for {simDate}.</p>
        )}
      </section>

      {/* End-of-day feedback */}
      {planExists && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-3">
            End-of-day Feedback
          </h2>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="How did today go? Any blockers or breakthroughs?"
            className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
          />
          <button
            onClick={saveNote}
            disabled={noteSaving || !note.trim()}
            className="mt-2 rounded-lg bg-zinc-800 dark:bg-zinc-700 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:hover:bg-zinc-600 disabled:opacity-40 transition-colors"
          >
            {noteSaving ? "Saving..." : noteSaved ? "Saved ✓" : "Save feedback"}
          </button>
        </section>
      )}

      {/* Actions */}
      <section>
        <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-3">Actions</h2>
        <div className="space-y-3">

          {/* Thinking */}
          <div>
            <button
              onClick={runThinking}
              disabled={planExists}
              className="w-full rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-violet-600 text-white hover:bg-violet-700"
            >
              {planExists ? "Thinking already run for this day" : "Run Thinking — generate tasks"}
            </button>
            {thinkingMsg && (
              <p className={`mt-1.5 text-xs ${thinkingMsg.ok ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
                {thinkingMsg.text}
              </p>
            )}
          </div>

          {/* Learning */}
          <div>
            <button
              onClick={runLearning}
              disabled={!planExists || learningDone}
              className="w-full rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-violet-600 text-white hover:bg-violet-700"
            >
              {!planExists
                ? "Run Learning — (need thinking first)"
                : learningDone
                ? "Learning already run for this day"
                : "Run Learning — calculate ECR + update stats"}
            </button>
            {learningMsg && (
              <p className={`mt-1.5 text-xs font-medium ${learningMsg.ok ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
                {learningMsg.text}
              </p>
            )}
          </div>

          {/* Reset */}
          <div>
            <button
              onClick={resetUser}
              className="w-full rounded-lg px-4 py-2.5 text-sm font-medium transition-colors bg-red-600 text-white hover:bg-red-700"
            >
              Reset User to Day 1
            </button>
            {resetMsg && (
              <p className={`mt-1.5 text-xs ${resetMsg.ok ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
                {resetMsg.text}
              </p>
            )}
          </div>

        </div>
      </section>
    </main>
  );
}
