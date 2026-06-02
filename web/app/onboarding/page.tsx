"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { saveActiveUser } from "@/features/user/useActiveUser";

// ── Context questions ─────────────────────────────────────────────────────────

const QUESTIONS = [
  {
    id: "skill_level",
    question: "What's your current level in this area?",
    options: ["Complete beginner", "Some basics", "Intermediate", "Advanced but rusty"],
  },
  {
    id: "hours_per_day",
    question: "How many hours per day can you commit?",
    options: ["Less than 1h", "1–2h", "2–4h", "4h+"],
  },
  {
    id: "motivation",
    question: "What's driving you?",
    options: ["Career change / job", "Side project", "Personal growth", "Academic requirement"],
  },
  {
    id: "past_attempts",
    question: "Have you tried learning this before?",
    options: ["No, first time", "Yes but gave up early", "Yes but inconsistently", "Yes, mostly succeeded"],
  },
  {
    id: "deadline",
    question: "How urgent is this goal?",
    options: ["No deadline, just improving", "Within 6 months", "Within 3 months", "ASAP — I'm under pressure"],
  },
];

// ── Types ─────────────────────────────────────────────────────────────────────

interface Milestone {
  week_number: number;
  objective: string;
}

interface OnboardResult {
  user_id: number;
  message: string;
  active_arc: {
    arc_name: string;
    milestones: Milestone[];
  };
}

type Step = "goal" | "questions" | "loading" | "success";

// ── Sub-components ────────────────────────────────────────────────────────────

function OptionButton({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-colors ${
        selected
          ? "border-violet-500 bg-violet-50 dark:bg-violet-950 text-violet-700 dark:text-violet-300 font-medium"
          : "border-zinc-200 dark:border-zinc-700 hover:border-violet-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
      }`}
    >
      {label}
    </button>
  );
}

function ProgressDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex gap-1.5 mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all ${
            i < current ? "bg-violet-600 w-6" : i === current ? "bg-violet-400 w-4" : "bg-zinc-200 dark:bg-zinc-700 w-4"
          }`}
        />
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("goal");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [error, setError] = useState("");
  const [result, setResult] = useState<OnboardResult | null>(null);

  // Form state
  const [username, setUsername] = useState("");
  const [mainGoal, setMainGoal] = useState("");
  const [timezone, setTimezone] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, []);

  function buildUserContext(): string {
    return QUESTIONS.map((q) => `${q.question} → ${answers[q.id] ?? "not answered"}`).join("\n");
  }

  async function handleForge() {
    setStep("loading");
    setError("");

    const res = await apiClient.post<OnboardResult>("/admin/onboarding/forge", {
      username: username.trim(),
      timezone,
      main_goal: mainGoal.trim(),
      user_context: buildUserContext(),
    });

    if (res.error) {
      setError(res.error);
      setStep("questions");
      return;
    }

    saveActiveUser(res.data.user_id);
    setResult(res.data);
    setStep("success");
  }

  // ── Step: Goal ──────────────────────────────────────────────────────────────
  if (step === "goal") {
    return (
      <main className="mx-auto w-full max-w-xl px-4 py-12">
        <div className="mb-8">
          <p className="text-xs font-semibold text-violet-600 uppercase tracking-widest mb-2">GrindOS</p>
          <h1 className="text-2xl font-bold tracking-tight">What's your goal?</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Be specific. The AI will craft a 30-day arc tailored to what you declare here.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="player1"
              className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500 placeholder-zinc-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Main Goal</label>
            <textarea
              value={mainGoal}
              onChange={(e) => setMainGoal(e.target.value)}
              placeholder="e.g. Learn Golang backend development to get a job in 6 months"
              rows={3}
              className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500 placeholder-zinc-400 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5 text-zinc-500">Timezone</label>
            <input
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500 text-zinc-500"
            />
          </div>

          <button
            onClick={() => setStep("questions")}
            disabled={!username.trim() || !mainGoal.trim()}
            className="w-full rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-40 transition-colors mt-2"
          >
            Continue →
          </button>
        </div>
      </main>
    );
  }

  // ── Step: Context questions ─────────────────────────────────────────────────
  if (step === "questions") {
    const q = QUESTIONS[questionIndex];
    const isLast = questionIndex === QUESTIONS.length - 1;
    const currentAnswer = answers[q.id];

    return (
      <main className="mx-auto w-full max-w-xl px-4 py-12">
        <ProgressDots total={QUESTIONS.length} current={questionIndex} />

        <div className="mb-6">
          <p className="text-xs text-zinc-400 mb-1">{questionIndex + 1} / {QUESTIONS.length}</p>
          <h2 className="text-xl font-bold tracking-tight">{q.question}</h2>
        </div>

        <div className="space-y-2 mb-8">
          {q.options.map((opt) => (
            <OptionButton
              key={opt}
              label={opt}
              selected={currentAnswer === opt}
              onClick={() => setAnswers((a) => ({ ...a, [q.id]: opt }))}
            />
          ))}
        </div>

        {error && (
          <p className="mb-4 text-sm text-red-500 rounded-lg bg-red-50 dark:bg-red-950 px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <button
            onClick={() =>
              questionIndex === 0 ? setStep("goal") : setQuestionIndex((i) => i - 1)
            }
            className="px-4 py-2.5 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            ← Back
          </button>

          {isLast ? (
            <button
              onClick={handleForge}
              disabled={!currentAnswer}
              className="flex-1 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-40 transition-colors"
            >
              Forge Arc →
            </button>
          ) : (
            <button
              onClick={() => setQuestionIndex((i) => i + 1)}
              disabled={!currentAnswer}
              className="flex-1 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-40 transition-colors"
            >
              Next →
            </button>
          )}
        </div>
      </main>
    );
  }

  // ── Step: Loading ───────────────────────────────────────────────────────────
  if (step === "loading") {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4">
        <div className="h-8 w-8 rounded-full border-2 border-violet-600 border-t-transparent animate-spin" />
        <p className="text-sm text-zinc-500">Forging your Arc with Gemini...</p>
        <p className="text-xs text-zinc-400">~10 seconds</p>
      </main>
    );
  }

  // ── Step: Success ───────────────────────────────────────────────────────────
  if (step === "success" && result) {
    return (
      <main className="mx-auto w-full max-w-xl px-4 py-12">
        <div className="mb-6">
          <span className="text-3xl">⚡</span>
          <h1 className="text-2xl font-bold tracking-tight mt-2">Arc forged.</h1>
          <p className="text-sm text-zinc-500 mt-1">
            User ID: {result.user_id} — your 30-day campaign is ready.
          </p>
        </div>

        <div className="rounded-lg border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950 px-5 py-4 mb-6">
          <p className="text-xs font-semibold text-violet-500 uppercase tracking-wide mb-3">
            {result.active_arc.arc_name}
          </p>
          <ul className="space-y-3">
            {result.active_arc.milestones.map((m) => (
              <li key={m.week_number} className="flex gap-3 text-sm">
                <span className="shrink-0 font-mono text-xs font-bold text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-900 px-1.5 py-0.5 rounded">
                  W{m.week_number}
                </span>
                <span className="text-zinc-700 dark:text-zinc-300">{m.objective}</span>
              </li>
            ))}
          </ul>
        </div>

        <button
          onClick={() => router.push("/admin")}
          className="w-full rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-700 transition-colors"
        >
          Go to Admin Panel →
        </button>
      </main>
    );
  }

  return null;
}
