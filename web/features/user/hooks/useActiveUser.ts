"use client";

import { useState } from "react";

const STORAGE_KEY = "grindos_active_user_id";

export function useActiveUser() {
  const [userId, setUserIdState] = useState<string>(() => {
    if (typeof window === "undefined") {
      return "1";
    }
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ?? "1";
  });

  function setUserId(id: string) {
    localStorage.setItem(STORAGE_KEY, String(id));
    setUserIdState(id);
  }

  return { userId, setUserId };
}

export function saveActiveUser(id: string) {
  localStorage.setItem(STORAGE_KEY, String(id));
}
