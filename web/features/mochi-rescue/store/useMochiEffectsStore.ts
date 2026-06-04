"use client";

import { createContext, useContext } from "react";
import { useStore } from "zustand";
import type {
  MochiEffectsState,
  MochiEffectsStore,
} from "./createMochiEffectsStore";

export const MochiEffectsStoreContext = createContext<MochiEffectsStore | null>(null);

export function useMochiEffectsStore<T>(selector: (state: MochiEffectsState) => T) {
  const store = useContext(MochiEffectsStoreContext);
  if (!store) {
    throw new Error("useMochiEffectsStore must be used within MochiEffectsProvider");
  }

  return useStore(store, selector);
}
