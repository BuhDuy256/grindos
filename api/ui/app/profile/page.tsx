"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { clearAuth } from "@/lib/auth";
import { toggleTheme } from "@/components/ThemeProvider";

const ACCENT_PRESETS = [
  { label: "Ochre",   value: "#D4830A" },
  { label: "Violet",  value: "#7C3AED" },
  { label: "Emerald", value: "#059669" },
  { label: "Rose",    value: "#E11D48" },
  { label: "Sky",     value: "#2563EB" },
];

const FONT_SIZES: { label: string; key: string; px: string }[] = [
  { label: "S", key: "small",  px: "13px" },
  { label: "M", key: "medium", px: "15px" },
  { label: "L", key: "large",  px: "18px" },
];

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [isDark, setIsDark]     = useState(false);
  const [fontSize, setFontSize] = useState("medium");
  const [accent, setAccent]     = useState("#D4830A");

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
    setFontSize(localStorage.getItem("grindos_font_size") || "medium");
    setAccent(
      localStorage.getItem("grindos_accent") ||
      getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() ||
      "#D4830A"
    );
  }, []);

  function handleThemeToggle() {
    const next = toggleTheme();
    setIsDark(next === "dark");
  }

  function handleFontSize(key: string, px: string) {
    document.documentElement.style.setProperty("--font-size-base", px);
    localStorage.setItem("grindos_font_size", key);
    setFontSize(key);
  }

  function handleAccent(value: string) {
    document.documentElement.style.setProperty("--accent", value);
    localStorage.setItem("grindos_accent", value);
    setAccent(value);
  }

  function handleLogout() {
    clearAuth();
    router.replace("/login");
  }

  if (loading) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-sm" style={{ color: "var(--muted)" }}>Loading...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-sm px-4 py-10">
      <h1 className="text-2xl font-bold tracking-tight mb-8">Profile</h1>

      {/* User card */}
      <div
        className="rounded-xl border p-5 mb-6 flex items-center gap-4"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <div
          className="h-12 w-12 rounded-full flex items-center justify-center text-lg font-bold shrink-0"
          style={{ background: "var(--accent)", color: "#fff" }}
        >
          {user?.username?.[0]?.toUpperCase()}
        </div>
        <div>
          <p className="font-semibold">{user?.username}</p>
          <p className="text-xs" style={{ color: "var(--muted)" }}>Player #{user?.id}</p>
        </div>
      </div>

      {/* Appearance settings */}
      <div className="rounded-xl border overflow-hidden mb-4" style={{ borderColor: "var(--border)" }}>
        {/* Theme toggle */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: `1px solid var(--border)` }}
        >
          <span className="text-sm font-medium">Theme</span>
          <button
            onClick={handleThemeToggle}
            className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors"
            style={{ borderColor: "var(--border)", background: "var(--bg)" }}
          >
            <span>{isDark ? "🌙" : "☀️"}</span>
            <span>{isDark ? "Dark" : "Light"}</span>
          </button>
        </div>

        {/* Font size */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: `1px solid var(--border)` }}
        >
          <span className="text-sm font-medium">Font size</span>
          <div className="flex gap-1">
            {FONT_SIZES.map(({ label, key, px }) => (
              <button
                key={key}
                onClick={() => handleFontSize(key, px)}
                className="w-9 h-9 rounded-lg text-xs font-semibold border transition-colors"
                style={{
                  borderColor: fontSize === key ? "var(--accent)" : "var(--border)",
                  background:  fontSize === key ? "var(--accent)" : "var(--bg)",
                  color:       fontSize === key ? "#fff" : "var(--fg)",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Accent color */}
        <div className="flex items-center justify-between px-5 py-4">
          <span className="text-sm font-medium">Accent color</span>
          <div className="flex gap-2">
            {ACCENT_PRESETS.map(({ label, value }) => (
              <button
                key={value}
                onClick={() => handleAccent(value)}
                title={label}
                className="h-7 w-7 rounded-full border-2 transition-all"
                style={{
                  background: value,
                  borderColor: accent === value ? "var(--fg)" : "transparent",
                  transform: accent === value ? "scale(1.2)" : "scale(1)",
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Admin link */}
      {user?.is_admin && (
        <div className="rounded-xl border overflow-hidden mb-4" style={{ borderColor: "var(--border)" }}>
          <Link
            href="/admin"
            className="flex items-center justify-between px-5 py-4 text-sm transition-colors"
          >
            <span className="font-medium">Admin Panel</span>
            <span style={{ color: "var(--muted)" }}>→</span>
          </Link>
        </div>
      )}

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full rounded-xl px-5 py-4 text-sm font-medium text-left border"
        style={{ borderColor: "var(--border)", color: "#ef4444" }}
      >
        Sign out
      </button>
    </main>
  );
}
