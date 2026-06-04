"use client";

import { useEffect } from "react";

/** Available theme names — add new entries here when creating themes */
export type ThemeName = "default" | "mochi";

const STORAGE_KEY_MODE = "grindos_theme";
const STORAGE_KEY_NAME = "grindos_theme_name";
const DEFAULT_THEME: ThemeName = "mochi";

/**
 * ThemeProvider — Syncs dark/light mode and named theme on mount.
 *
 * Reads from localStorage and applies:
 *  - `.dark` class for color-scheme
 *  - `data-theme` attribute for named theme (e.g. "mochi")
 */
export function ThemeProvider() {
  useEffect(() => {
    const root = document.documentElement;

    // Dark / Light mode
    const stored = localStorage.getItem(STORAGE_KEY_MODE);
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (stored === "dark" || (stored !== "light" && prefersDark)) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    // Named theme
    const themeName = (localStorage.getItem(STORAGE_KEY_NAME) as ThemeName) || DEFAULT_THEME;
    root.setAttribute("data-theme", themeName);
  }, []);

  return null;
}

/** Toggle between dark and light mode. Returns the new mode. */
export function toggleTheme(): "dark" | "light" {
  const isDark = document.documentElement.classList.contains("dark");
  if (isDark) {
    document.documentElement.classList.remove("dark");
    localStorage.setItem(STORAGE_KEY_MODE, "light");
    return "light";
  } else {
    document.documentElement.classList.add("dark");
    localStorage.setItem(STORAGE_KEY_MODE, "dark");
    return "dark";
  }
}

/** Switch to a named theme. Updates DOM + localStorage. */
export function setTheme(name: ThemeName): void {
  document.documentElement.setAttribute("data-theme", name);
  localStorage.setItem(STORAGE_KEY_NAME, name);
}

/** Get the current theme name from the DOM. */
export function getTheme(): ThemeName {
  return (document.documentElement.getAttribute("data-theme") as ThemeName) || DEFAULT_THEME;
}
