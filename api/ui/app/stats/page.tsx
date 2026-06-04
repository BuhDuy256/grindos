"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/hooks/useAuth";

interface Stats {
  level: number;
  exp: number;
  str_stat: number;
  int_stat: number;
  vit_stat: number;
  streak: number;
  difficulty_multiplier: number;
}

interface EcrEntry {
  date: string;
  ecr_score: number;
  learning_summary: string | null;
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border p-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
      <p className="text-xs font-medium uppercase tracking-widest mb-1" style={{ color: "var(--muted)" }}>
        {label}
      </p>
      <p className="text-2xl font-bold tracking-tight">{value}</p>
      {sub && <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{sub}</p>}
    </div>
  );
}

function EcrBar({ entry, max }: { entry: EcrEntry; max: number }) {
  const pct = entry.ecr_score;
  const color = pct >= 85 ? "#22c55e" : pct >= 65 ? "var(--accent)" : "#ef4444";
  const label = pct >= 85 ? "POWER UP" : pct >= 65 ? "STABLE" : "PENALTY";
  const dayLabel = new Date(entry.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

  return (
    <div className="flex items-end gap-2 group">
      <div className="w-20 shrink-0 text-right">
        <p className="text-[10px] leading-tight" style={{ color: "var(--muted)" }}>{dayLabel}</p>
      </div>
      <div className="flex-1 flex items-center gap-2">
        <div
          className="h-6 rounded-full transition-all"
          style={{ width: `${(pct / (max || 100)) * 100}%`, minWidth: 4, background: color }}
        />
        <span className="text-xs font-mono font-medium" style={{ color }}>{pct}%</span>
        <span className="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "var(--muted)" }}>
          {label}
        </span>
      </div>
    </div>
  );
}

export default function StatsPage() {
  const { user, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [history, setHistory] = useState<EcrEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      apiClient.get<Stats>(`/v1/player/profile?user_id=${user.id}`),
      apiClient.get<{ history: EcrEntry[] }>(`/v1/player/ecr-history?user_id=${user.id}&days=14`),
    ]).then(([statsRes, ecrRes]) => {
      if (!statsRes.error) setStats(statsRes.data);
      if (!ecrRes.error) setHistory(ecrRes.data.history);
      setLoading(false);
    });
  }, [user]);

  if (authLoading || loading) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-sm" style={{ color: "var(--muted)" }}>Loading...</p>
      </main>
    );
  }

  if (!stats) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-sm" style={{ color: "var(--muted)" }}>No stats found.</p>
      </main>
    );
  }

  const maxEcr = Math.max(...history.map((h) => h.ecr_score), 100);

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-10">
      <h1 className="text-2xl font-bold tracking-tight mb-1">Stats</h1>
      <p className="text-sm mb-8" style={{ color: "var(--muted)" }}>{user?.username}</p>

      {/* RPG stats grid */}
      <div className="grid grid-cols-2 gap-3 mb-10">
        <StatCard label="Level" value={stats.level} sub={`${stats.exp} EXP`} />
        <StatCard label="Streak" value={`${stats.streak}d`} sub="consecutive days" />
        <StatCard label="STR" value={stats.str_stat} sub="Strength" />
        <StatCard label="INT" value={stats.int_stat} sub="Intelligence" />
        <StatCard label="VIT" value={stats.vit_stat} sub="Vitality" />
        <StatCard label="Multiplier" value={`×${stats.difficulty_multiplier.toFixed(2)}`} sub="difficulty" />
      </div>

      {/* ECR history */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: "var(--muted)" }}>
          ECR History
        </h2>
        {history.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--muted)" }}>No completed days yet.</p>
        ) : (
          <div className="space-y-3">
            {history.map((entry) => (
              <EcrBar key={entry.date} entry={entry} max={maxEcr} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
