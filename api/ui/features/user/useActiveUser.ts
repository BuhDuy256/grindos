"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "grindos_active_user_id";

export function useActiveUser() {
  const [userId, setUserIdState] = useState<number>(1);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setUserIdState(parseInt(stored));
  }, []);

  function setUserId(id: number) {
    localStorage.setItem(STORAGE_KEY, String(id));
    setUserIdState(id);
  }

  return { userId, setUserId };
}

export function saveActiveUser(id: number) {
  localStorage.setItem(STORAGE_KEY, String(id));
}
