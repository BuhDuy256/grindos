import { useFocusTimerStore } from "../store/useFocusTimerStore";
import { useDailyPlanMutations } from "./useDailyPlanMutations";
import { useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";

export function useTaskFocusTimer() {
  const store = useFocusTimerStore();
  const { saveFocusTime } = useDailyPlanMutations();
  const { user } = useAuth();

  const handleStop = useCallback(() => {
    if (!store.activeTaskId || !store.startedAt || !store.activeDate) return;

    const elapsed = Math.floor((Date.now() - store.startedAt) / 1000) + store.elapsedBeforeStart;

    // Fire mutation to save elapsed time
    if (user?.id) {
      saveFocusTime.mutate({
        taskId: store.activeTaskId,
        userId: user.id,
        date: store.activeDate,
        elapsedSeconds: elapsed,
      });
    }

    store.resetTimer();
  }, [store, saveFocusTime, user]);

  const handleStart = useCallback((taskId: string, title: string, durationMins: number, date: string, elapsedBeforeStart = 0) => {
    if (store.activeTaskId === taskId && store.isRunning) return;

    if (store.activeTaskId && store.isRunning) {
      handleStop();
    }

    store.startTimer(taskId, title, durationMins, date, elapsedBeforeStart);
  }, [store, handleStop]);

  return {
    activeTaskId: store.activeTaskId,
    activeTaskTitle: store.activeTaskTitle,
    activeDurationMins: store.activeDurationMins,
    activeDate: store.activeDate,
    startedAt: store.startedAt,
    elapsedBeforeStart: store.elapsedBeforeStart,
    isRunning: store.isRunning,
    handleStart,
    handleStop,
    resetTimer: store.resetTimer,
    isSaving: saveFocusTime.isPending,
  };
}
