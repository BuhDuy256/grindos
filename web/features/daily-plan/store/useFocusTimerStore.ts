import { create } from "zustand";

interface FocusTimerState {
  activeTaskId: string | null;
  activeTaskTitle: string | null;
  activeDurationMins: number | null;
  activeDate: string | null;
  startedAt: number | null;
  elapsedBeforeStart: number;
  isRunning: boolean;
  startTimer: (taskId: string, title: string, durationMins: number, date: string, elapsedBeforeStart?: number) => void;
  stopTimer: () => void;
  resetTimer: () => void;
}

export const useFocusTimerStore = create<FocusTimerState>((set) => ({
  activeTaskId: null,
  activeTaskTitle: null,
  activeDurationMins: null,
  activeDate: null,
  startedAt: null,
  elapsedBeforeStart: 0,
  isRunning: false,
  startTimer: (taskId, title, durationMins, date, elapsedBeforeStart = 0) =>
    set({
      activeTaskId: taskId,
      activeTaskTitle: title,
      activeDurationMins: durationMins,
      activeDate: date,
      startedAt: Date.now(),
      elapsedBeforeStart,
      isRunning: true,
    }),
  stopTimer: () => set({ isRunning: false }),
  resetTimer: () =>
    set({
      activeTaskId: null,
      activeTaskTitle: null,
      activeDurationMins: null,
      activeDate: null,
      startedAt: null,
      elapsedBeforeStart: 0,
      isRunning: false,
    }),
}));
