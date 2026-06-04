"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { todayISO } from "@/features/daily-plan/date";
import { MochiProgressBar } from "@/features/mochi-rescue/components/MochiProgressBar";
import { MochiRescueScene } from "@/features/mochi-rescue/components/MochiRescueScene";
import { useMochiStage } from "@/features/mochi-rescue/hooks/useMochiStage";
import { getMochiStage } from "@/features/mochi-rescue/utils/getMochiStage";
import { useTaskFocusTimer } from "@/features/daily-plan/hooks/useTaskFocusTimer";
import type { MochiStage } from "@/features/mochi-rescue/types";
import { useSidebarSummary } from "@/features/shell/hooks/useSidebarSummary";
import { useAuth } from "@/hooks/useAuth";
import type { ShellDailyPlanContext } from "./AppShell";
import styles from "./ShellSidebar.module.css";

function MochiScenePanels({
  progress,
  stage,
}: {
  progress: number;
  stage: MochiStage;
}) {
  return (
    <>
      <MochiProgressBar progress={progress} />
      <MochiRescueScene stage={stage} />
    </>
  );
}

function DailyPlanMochiPanels({ context }: { context: ShellDailyPlanContext }) {
  const { progressPercent, stage } = useMochiStage(context.userId, context.date);

  return <MochiScenePanels progress={progressPercent} stage={stage} />;
}

function SidebarMochiPanels({ context }: { context?: ShellDailyPlanContext }) {
  if (context) {
    return <DailyPlanMochiPanels context={context} />;
  }

  return <MochiScenePanels progress={0} stage={getMochiStage(0)} />;
}

function formatStreak(days: number) {
  return `Streak ${days} ${days === 1 ? "day" : "days"}`;
}

export function ShellSidebar({
  dailyPlanContext,
}: {
  dailyPlanContext?: ShellDailyPlanContext;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const { summary } = useSidebarSummary(user?.id);
  const {
    activeTaskTitle,
    activeDurationMins,
    startedAt,
    elapsedBeforeStart,
    isRunning,
    handleStop,
    isSaving,
  } = useTaskFocusTimer();

  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!isRunning || !startedAt) {
      if (!isRunning) setElapsedSeconds(0);
      return;
    }

    setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000) + elapsedBeforeStart);

    const id = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000) + elapsedBeforeStart);
    }, 1000);
    return () => clearInterval(id);
  }, [isRunning, startedAt, elapsedBeforeStart]);

  const remainingSeconds = Math.max(0, (activeDurationMins || 0) * 60 - elapsedSeconds);
  const mm = String(Math.floor(remainingSeconds / 60)).padStart(2, "0");
  const ss = String(remainingSeconds % 60).padStart(2, "0");
  const displayTitle = activeTaskTitle || "Idle";
  const mainGoal = summary?.main_goal ?? "Set your main goal";
  const streak = summary?.streak ?? 0;
  const isProfile = pathname?.startsWith("/profile");
  const mochiContext = dailyPlanContext ?? (user ? { userId: user.id, date: todayISO() } : undefined);

  return (
    <aside className={styles.sidebar}>
      <div className={styles.headerRow}>
        <div className={styles.headerInfo}>
          <span className={styles.goalLabel} title={mainGoal}>
            {mainGoal}
          </span>
          <h1 className={styles.streak}>{formatStreak(streak)}</h1>
        </div>
        <button
          className={styles.settingsButton}
          aria-label={isProfile ? "Go back" : "Open profile"}
          onClick={() => {
            if (isProfile) {
              router.push("/daily-plan");
            } else {
              router.push("/profile");
            }
          }}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            {isProfile ? "arrow_back" : "settings"}
          </span>
        </button>
      </div>

      <SidebarMochiPanels context={mochiContext} />

      <div className={styles.timer}>
        <div className={styles.timerLeft}>
          <span className="material-symbols-outlined" aria-hidden="true">
            timer
          </span>
          <div className={styles.timerText}>
            <span className={styles.timerDisplay}>{mm}:{ss}</span>
            <span className={styles.timerTask}>{displayTitle}</span>
          </div>
        </div>
        <button
          className={styles.timerBtn}
          onClick={handleStop}
          disabled={!isRunning || isSaving}
          aria-label={isRunning ? "Stop timer" : "No active timer"}
        >
          <span
            className="material-symbols-outlined"
            aria-hidden="true"
            style={isRunning ? { fontVariationSettings: "'FILL' 1" } : undefined}
          >
            {isRunning ? "stop" : "play_arrow"}
          </span>
        </button>
      </div>

      <div className={styles.spacer} />

      <div className={styles.footer}>
        <span className={styles.footerText}>Mood: Calm</span>
      </div>
    </aside>
  );
}
