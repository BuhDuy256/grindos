"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { clearSidebarSummaryCache } from "@/features/shell/services/sidebarSummaryService";
import { useAuth } from "@/hooks/useAuth";
import { forgeOnboarding } from "../services/onboardingService";
import type { OnboardResult, OnboardingStep } from "../types";

export const QUESTIONS = [
  {
    id: "skill_level",
    question: "What is your current level in this area?",
    options: ["Complete beginner", "Some basics", "Intermediate", "Advanced but rusty"],
  },
  {
    id: "hours_per_day",
    question: "How many hours per day can you commit?",
    options: ["Less than 1h", "1-2h", "2-4h", "4h+"],
  },
  {
    id: "motivation",
    question: "What is driving you?",
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
    options: ["No deadline, just improving", "Within 6 months", "Within 3 months", "ASAP"],
  },
];

export function useOnboardingFlow() {
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();
  const [step, setStep] = useState<OnboardingStep>("goal");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [error, setError] = useState("");
  const [result, setResult] = useState<OnboardResult | null>(null);
  const [mainGoal, setMainGoal] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});

  function setAnswer(id: string, value: string) {
    setAnswers((current) => ({ ...current, [id]: value }));
  }

  function buildUserContext() {
    return QUESTIONS.map((question) =>
      `${question.question} -> ${answers[question.id] ?? "not answered"}`,
    ).join("\n");
  }

  async function forge() {
    if (!user) return;

    setStep("loading");
    setError("");
    const res = await forgeOnboarding({
      userId: user.id,
      mainGoal: mainGoal.trim(),
      userContext: buildUserContext(),
    });

    if (res.error || !res.data) {
      setError(res.error ?? "Onboarding failed");
      setStep("questions");
      return;
    }

    clearSidebarSummaryCache(user.id);
    queryClient.removeQueries({ queryKey: ["shell-sidebar-summary", user.id] });
    setResult(res.data);
    setStep("success");
  }

  return {
    user,
    authLoading,
    step,
    setStep,
    questionIndex,
    setQuestionIndex,
    error,
    result,
    mainGoal,
    setMainGoal,
    answers,
    setAnswer,
    forge,
  };
}
