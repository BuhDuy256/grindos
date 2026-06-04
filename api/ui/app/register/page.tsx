"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import { setAuth, isLoggedIn } from "@/lib/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isLoggedIn()) router.replace("/daily-plan");
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password) return;
    if (password !== confirm) { setError("Passwords don't match"); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }

    setLoading(true);
    setError("");

    const res = await apiClient.post<{
      token: string; user_id: number; username: string; is_admin: boolean;
    }>("/auth/register", { username: username.trim(), password });

    setLoading(false);
    if (res.error) {
      const msg = res.error.includes("409") || res.error.toLowerCase().includes("taken")
        ? "Username already taken" : "Registration failed";
      setError(msg);
      return;
    }

    setAuth(res.data.token, {
      id: res.data.user_id,
      username: res.data.username,
      is_admin: res.data.is_admin,
    });

    router.push("/onboarding");
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--accent)" }}>
            GrindOS
          </p>
          <h1 className="text-2xl font-bold tracking-tight">Start your arc</h1>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>Create an account to begin</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="player_one"
              autoComplete="username"
              className="w-full rounded-lg px-3 py-2 text-sm outline-none border"
              style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--fg)" }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="min. 6 characters"
              autoComplete="new-password"
              className="w-full rounded-lg px-3 py-2 text-sm outline-none border"
              style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--fg)" }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Confirm password</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
              className="w-full rounded-lg px-3 py-2 text-sm outline-none border"
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
            disabled={loading || !username.trim() || !password || !confirm}
            className="w-full rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-opacity disabled:opacity-40"
            style={{ background: "var(--accent)" }}
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-sm text-center" style={{ color: "var(--muted)" }}>
          Already have an account?{" "}
          <Link href="/login" className="font-medium" style={{ color: "var(--accent)" }}>
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
