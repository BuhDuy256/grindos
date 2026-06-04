import { createStore } from "zustand/vanilla";
import type { MochiEffectEvent } from "../types";

export interface MochiEffectsState {
  activeEffect: MochiEffectEvent | null;
  effectQueue: MochiEffectEvent[];
  isAnimating: boolean;
  soundEnabled: boolean;
  enqueueEffect: (effect: MochiEffectEvent) => void;
  startNextEffect: () => void;
  completeActiveEffect: () => void;
  clearEffects: () => void;
  setSoundEnabled: (enabled: boolean) => void;
}

export type MochiEffectsStore = ReturnType<typeof createMochiEffectsStore>;

export function createMochiEffectsStore() {
  return createStore<MochiEffectsState>((set) => ({
    activeEffect: null,
    effectQueue: [],
    isAnimating: false,
    soundEnabled: true,
    enqueueEffect: (effect) =>
      set((state) => {
        if (!state.activeEffect && !state.isAnimating) {
          return {
            activeEffect: effect,
            isAnimating: true,
          };
        }

        return {
          effectQueue: [...state.effectQueue, effect],
        };
      }),
    startNextEffect: () =>
      set((state) => {
        const [nextEffect, ...remainingEffects] = state.effectQueue;
        return {
          activeEffect: nextEffect ?? null,
          effectQueue: remainingEffects,
          isAnimating: Boolean(nextEffect),
        };
      }),
    completeActiveEffect: () =>
      set((state) => {
        const [nextEffect, ...remainingEffects] = state.effectQueue;
        return {
          activeEffect: nextEffect ?? null,
          effectQueue: remainingEffects,
          isAnimating: Boolean(nextEffect),
        };
      }),
    clearEffects: () =>
      set({
        activeEffect: null,
        effectQueue: [],
        isAnimating: false,
      }),
    setSoundEnabled: (soundEnabled) => set({ soundEnabled }),
  }));
}
