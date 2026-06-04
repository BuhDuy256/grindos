"use client";

import { useEffect } from "react";

export function ThemeProvider() {
  useEffect(() => {
    // Sync in case localStorage changed in another tab
    const stored = localStorage.getItem("grindos_theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (stored === "dark" || (stored !== "light" && prefersDark)) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  return null;
}

export function toggleTheme(): "dark" | "light" {
  const isDark = document.documentElement.classList.contains("dark");
  if (isDark) {
    document.documentElement.classList.remove("dark");
    localStorage.setItem("grindos_theme", "light");
    return "light";
  } else {
    document.documentElement.classList.add("dark");
    localStorage.setItem("grindos_theme", "dark");
    return "dark";
  }
}
