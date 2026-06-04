"use client";

import { useContext, useEffect, useState } from "react";
import { createMochiEffectsStore } from "../store/createMochiEffectsStore";
import { MochiEffectsStoreContext } from "../store/useMochiEffectsStore";

export function MochiEffectsProvider({
  children,
  resetKey,
}: {
  children: React.ReactNode;
  resetKey?: string;
}) {
  const parentStore = useContext(MochiEffectsStoreContext);
  const [store] = useState(() => createMochiEffectsStore());

  useEffect(() => {
    if (parentStore) {
      return;
    }

    store.getState().clearEffects();
  }, [parentStore, resetKey, store]);

  useEffect(() => {
    if (parentStore) {
      return;
    }

    return () => {
      store.getState().clearEffects();
    };
  }, [parentStore, store]);

  if (parentStore) {
    return children;
  }

  return (
    <MochiEffectsStoreContext.Provider value={store}>
      {children}
    </MochiEffectsStoreContext.Provider>
  );
}
