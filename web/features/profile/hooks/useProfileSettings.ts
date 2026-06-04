"use client";

import { useEffect, useState } from "react";
import { toggleTheme } from "@/components/ThemeProvider";

export const ACCENT_PRESETS = [
  { label: "Amber", value: "#F8D66D" },
  { label: "Mint", value: "#A8E6CF" },
  { label: "Graphite", value: "#2D2D2D" },
  { label: "Coral", value: "#FF8A80" },
  { label: "Sky", value: "#7CC7FF" },
];

export const FONT_SIZES = [
  { label: "S", key: "small", px: "14px" },
  { label: "M", key: "medium", px: "16px" },
  { label: "L", key: "large", px: "18px" },
];

export function useProfileSettings() {
  const [isDark, setIsDark] = useState(false);
  const [fontSize, setFontSize] = useState("medium");
  const [accent, setAccent] = useState("#F8D66D");

  useEffect(() => {
    queueMicrotask(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
      setFontSize(localStorage.getItem("grindos_font_size") || "medium");
      setAccent(
        localStorage.getItem("grindos_accent") ||
          getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() ||
          "#F8D66D",
      );
    });
  }, []);

  function setTheme(nextTheme: "dark" | "light") {
    const currentlyDark = document.documentElement.classList.contains("dark");
    if ((nextTheme === "dark") !== currentlyDark) {
      const next = toggleTheme();
      setIsDark(next === "dark");
      return;
    }

    localStorage.setItem("grindos_theme", nextTheme);
    setIsDark(nextTheme === "dark");
  }

  function setFontSizeChoice(key: string, px: string) {
    document.documentElement.style.setProperty("--font-size-base", px);
    localStorage.setItem("grindos_font_size", key);
    setFontSize(key);
  }

  function setAccentColor(value: string) {
    document.documentElement.style.setProperty("--accent", value);
    localStorage.setItem("grindos_accent", value);
    setAccent(value);
  }

  return {
    isDark,
    fontSize,
    accent,
    setTheme,
    setFontSizeChoice,
    setAccentColor,
  };
}
