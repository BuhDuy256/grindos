"use client";

import { useCallback, useEffect, useState } from "react";
import { todayISO } from "@/features/daily-plan/date";
import { useActiveUser } from "@/features/user/hooks/useActiveUser";
import {
  fetchAdminPlan,
  fetchAdminStats,
  resetUser,
  runLearning,
  runThinking,
  saveAdminNote,
} from "../services/adminService";
import type { DailyPlan, PlayerStats } from "../types";
export { addDays } from "@/features/daily-plan/date";

export function useAdminDashboard() {
  const today = todayISO();
  const { userId, setUserId } = useActiveUser();
  const [simDate, setSimDate] = useState(today);
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [prevStats, setPrevStats] = useState<PlayerStats | null>(null);
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [note, setNote] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [statsRes, planRes] = await Promise.all([
      fetchAdminStats(userId),
      fetchAdminPlan(userId, simDate),
    ]);

    if (!statsRes.error) setStats(statsRes.data);
    if (!planRes.error && planRes.data) {
      setPlan(planRes.data);
      setNote(planRes.data.user_note ?? "");
    } else {
      setPlan(null);
      setNote("");
    }
    setLoading(false);
    return statsRes.error ? null : statsRes.data;
  }, [simDate, userId]);

  useEffect(() => {
    queueMicrotask(() => {
      setStats(null);
      setPlan(null);
      setPrevStats(null);
      setMessage("");
      setNote("");
      void loadData();
    });
  }, [loadData]);

  async function saveNote() {
    setNoteSaving(true);
    await saveAdminNote(userId, simDate, note);
    setNoteSaving(false);
    setMessage("Feedback saved.");
  }

  async function executeThinking() {
    setMessage("");
    const res = await runThinking(userId, simDate);
    if (res.error) {
      setMessage(`Error: ${res.error}`);
      return;
    }
    await loadData();
    setMessage(`Tasks generated for ${simDate}.`);
  }

  async function executeLearning() {
    setMessage("");
    const snapshot = stats;
    const res = await runLearning(userId, simDate);
    if (res.error) {
      setMessage(`Error: ${res.error}`);
      return;
    }
    const nextStats = await loadData();
    setPrevStats(snapshot);
    setMessage(`Learning completed for ${simDate}.`);
    void nextStats;
  }

  async function executeReset() {
    const res = await resetUser(userId);
    if (res.error) {
      setMessage(`Error: ${res.error}`);
      return;
    }
    setSimDate(today);
    await loadData();
    setMessage("Reset to Day 1.");
  }

  return {
    today,
    userId,
    setUserId,
    simDate,
    setSimDate,
    stats,
    prevStats,
    plan,
    loading,
    message,
    note,
    noteSaving,
    setNote,
    saveNote,
    executeThinking,
    executeLearning,
    executeReset,
  };
}
