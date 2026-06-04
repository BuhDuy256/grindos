"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import { setAuth, isLoggedIn } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isLoggedIn()) router.replace("/daily-plan");
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setLoading(true);
    setError("");

    const res = await apiClient.post<{
      token: string; user_id: number; username: string; is_admin: boolean; is_onboarded: boolean;
    }>("/auth/login", { username: username.trim(), password });

    setLoading(false);
    if (res.error) {
      setError("Invalid username or password");
      return;
    }

    setAuth(res.data.token, {
      id: res.data.user_id,
      username: res.data.username,
      is_admin: res.data.is_admin,
    });

    router.push(res.data.is_onboarded ? "/daily-plan" : "/onboarding");
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--accent)" }}>
            GrindOS
          </p>
          <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>Sign in to continue your arc</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="your_username"
              autoComplete="username"
              className="w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 border"
              style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--fg)" }}
              style={{ ["--tw-ring-color" as string]: "var(--accent)" }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              className="w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 border"
              style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--fg)" }}
            />
          </div>

          {error && (
            <p className="text-sm rounded-lg px-3 py-2" style={{ color: "var(--accent)", background: "var(--surface)" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !username.trim() || !password}
            className="w-full rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-opacity disabled:opacity-40"
            style={{ background: "var(--accent)" }}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-sm text-center" style={{ color: "var(--muted)" }}>
          New here?{" "}
          <Link href="/register" className="font-medium" style={{ color: "var(--accent)" }}>
            Create account
          </Link>
        </p>
      </div>
    </main>
  );
}
