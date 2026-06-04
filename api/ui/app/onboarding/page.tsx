"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/hooks/useAuth";

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

interface Milestone { week_number: number; objective: string; }
interface OnboardResult { user_id: number; message: string; active_arc: { arc_name: string; milestones: Milestone[] }; }
type Step = "goal" | "questions" | "loading" | "success";

function OptionButton({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left px-4 py-3 rounded-xl border text-sm transition-colors"
      style={{
        borderColor: selected ? "var(--accent)" : "var(--border)",
        background: selected ? "var(--surface)" : "transparent",
        color: selected ? "var(--accent)" : "var(--fg)",
        fontWeight: selected ? 500 : 400,
      }}
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
          className="h-1 rounded-full transition-all"
          style={{
            width: i === current ? 24 : 16,
            background: i <= current ? "var(--accent)" : "var(--border)",
          }}
        />
      ))}
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [step, setStep] = useState<Step>("goal");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [error, setError] = useState("");
  const [result, setResult] = useState<OnboardResult | null>(null);
  const [mainGoal, setMainGoal] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});

  function buildUserContext() {
    return QUESTIONS.map((q) => `${q.question} → ${answers[q.id] ?? "not answered"}`).join("\n");
  }

  async function handleForge() {
    if (!user) return;
    setStep("loading");
    setError("");

    const res = await apiClient.post<OnboardResult>("/admin/onboarding/forge", {
      user_id: user.id,
      main_goal: mainGoal.trim(),
      user_context: buildUserContext(),
    });

    if (res.error) {
      setError(res.error);
      setStep("questions");
      return;
    }

    setResult(res.data);
    setStep("success");
  }

  if (authLoading) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-sm" style={{ color: "var(--muted)" }}>Loading...</p>
      </main>
    );
  }

  if (step === "goal") {
    return (
      <main className="mx-auto w-full max-w-xl px-4 py-12">
        <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--accent)" }}>
          Welcome, {user?.username}
        </p>
        <h1 className="text-2xl font-bold tracking-tight mb-1">What's your goal?</h1>
        <p className="text-sm mb-8" style={{ color: "var(--muted)" }}>
          Be specific. The AI will craft a 30-day arc tailored to what you declare here.
        </p>

        <textarea
          value={mainGoal}
          onChange={(e) => setMainGoal(e.target.value)}
          placeholder="e.g. Learn Golang backend development to get a job in 6 months"
          rows={4}
          className="w-full rounded-xl border px-4 py-3 text-sm outline-none resize-none mb-4"
          style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--fg)" }}
        />

        <button
          onClick={() => setStep("questions")}
          disabled={!mainGoal.trim()}
          className="w-full rounded-xl px-4 py-3 text-sm font-medium text-white transition-opacity disabled:opacity-40"
          style={{ background: "var(--accent)" }}
        >
          Continue →
        </button>
      </main>
    );
  }

  if (step === "questions") {
    const q = QUESTIONS[questionIndex];
    const isLast = questionIndex === QUESTIONS.length - 1;

    return (
      <main className="mx-auto w-full max-w-xl px-4 py-12">
        <ProgressDots total={QUESTIONS.length} current={questionIndex} />

        <p className="text-xs mb-1" style={{ color: "var(--muted)" }}>{questionIndex + 1} / {QUESTIONS.length}</p>
        <h2 className="text-xl font-bold tracking-tight mb-6">{q.question}</h2>

        <div className="space-y-2 mb-8">
          {q.options.map((opt) => (
            <OptionButton
              key={opt}
              label={opt}
              selected={answers[q.id] === opt}
              onClick={() => setAnswers((a) => ({ ...a, [q.id]: opt }))}
            />
          ))}
        </div>

        {error && (
          <p className="mb-4 text-sm rounded-xl px-4 py-3" style={{ color: "var(--accent)", background: "var(--surface)" }}>
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => questionIndex === 0 ? setStep("goal") : setQuestionIndex((i) => i - 1)}
            className="px-4 py-3 text-sm rounded-xl border transition-colors"
            style={{ borderColor: "var(--border)" }}
          >
            ← Back
          </button>
          {isLast ? (
            <button
              onClick={handleForge}
              disabled={!answers[q.id]}
              className="flex-1 rounded-xl px-4 py-3 text-sm font-medium text-white transition-opacity disabled:opacity-40"
              style={{ background: "var(--accent)" }}
            >
              Forge Arc →
            </button>
          ) : (
            <button
              onClick={() => setQuestionIndex((i) => i + 1)}
              disabled={!answers[q.id]}
              className="flex-1 rounded-xl px-4 py-3 text-sm font-medium text-white transition-opacity disabled:opacity-40"
              style={{ background: "var(--accent)" }}
            >
              Next →
            </button>
          )}
        </div>
      </main>
    );
  }

  if (step === "loading") {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4">
        <div
          className="h-8 w-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }}
        />
        <p className="text-sm" style={{ color: "var(--muted)" }}>Forging your Arc with AI...</p>
        <p className="text-xs" style={{ color: "var(--muted)" }}>~10 seconds</p>
      </main>
    );
  }

  if (step === "success" && result) {
    return (
      <main className="mx-auto w-full max-w-xl px-4 py-12">
        <h1 className="text-2xl font-bold tracking-tight mb-1">Arc forged.</h1>
        <p className="text-sm mb-8" style={{ color: "var(--muted)" }}>
          Your 30-day campaign is ready.
        </p>

        <div
          className="rounded-xl border px-5 py-4 mb-8"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: "var(--accent)" }}>
            {result.active_arc.arc_name}
          </p>
          <ul className="space-y-3">
            {result.active_arc.milestones.map((m) => (
              <li key={m.week_number} className="flex gap-3 text-sm">
                <span
                  className="shrink-0 font-mono text-xs font-bold px-1.5 py-0.5 rounded"
                  style={{ color: "var(--accent)", background: "var(--border)" }}
                >
                  W{m.week_number}
                </span>
                <span style={{ color: "var(--fg)" }}>{m.objective}</span>
              </li>
            ))}
          </ul>
        </div>

        <button
          onClick={() => router.push("/daily-plan")}
          className="w-full rounded-xl px-4 py-3 text-sm font-medium text-white"
          style={{ background: "var(--accent)" }}
        >
          Go to Daily Plan →
        </button>
      </main>
    );
  }

  return null;
}
