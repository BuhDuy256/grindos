"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { setAuth } from "@/lib/auth";
import { login, register } from "../services/authService";
import styles from "./AuthScreen.module.css";

function getAuthErrorMessage(error: string, isRegister: boolean) {
  if (/invalid username or password/i.test(error)) {
    return "Invalid username or password";
  }

  if (/failed to fetch|network|load failed/i.test(error)) {
    return "Cannot reach the web API. Check NEXT_PUBLIC_API_URL or restart the web server.";
  }

  return error || (isRegister ? "Registration failed" : "Invalid username or password");
}

export function AuthScreen({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const isRegister = mode === "register";

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!username.trim() || !password) return;
    if (isRegister && password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    if (isRegister && password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    setError("");
    const res = isRegister
      ? await register({ username: username.trim(), password })
      : await login({ username: username.trim(), password });
    setLoading(false);

    if (res.error || !res.data) {
      setError(getAuthErrorMessage(res.error ?? "", isRegister));
      return;
    }

    setAuth(res.data.token, {
      id: res.data.user_id,
      username: res.data.username,
      is_admin: res.data.is_admin,
    }, {
      isOnboarded: res.data.is_onboarded ?? false,
    });

    router.push(isRegister || !res.data.is_onboarded ? "/onboarding" : "/daily-plan");
  }

  return (
    <main className={styles.page}>
      <section className={styles.panel}>
        <p className={styles.eyebrow}>GrindOS</p>
        <h1 className={styles.title}>{isRegister ? "Start your arc" : "Welcome back"}</h1>
        <p className={styles.subtitle}>
          {isRegister ? "Create an account to begin." : "Sign in to continue your daily plan."}
        </p>

        <form className={styles.form} onSubmit={submit}>
          <label className={styles.field}>
            <span className={styles.label}>Username</span>
            <input
              className={styles.input}
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              placeholder={isRegister ? "player_one" : "your_username"}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Password</span>
            <input
              className={styles.input}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={isRegister ? "new-password" : "current-password"}
              placeholder={isRegister ? "min. 6 characters" : "password"}
            />
          </label>

          {isRegister ? (
            <label className={styles.field}>
              <span className={styles.label}>Confirm password</span>
              <input
                className={styles.input}
                type="password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                autoComplete="new-password"
                placeholder="repeat password"
              />
            </label>
          ) : null}

          {error ? <p className={styles.error}>{error}</p> : null}

          <button
            className={styles.button}
            disabled={loading || !username.trim() || !password || (isRegister && !confirm)}
            type="submit"
          >
            {loading ? "Working..." : isRegister ? "Create account" : "Sign in"}
          </button>
        </form>

        <p className={styles.switch}>
          {isRegister ? "Already have an account?" : "New here?"}{" "}
          <Link className={styles.link} href={isRegister ? "/login" : "/register"}>
            {isRegister ? "Sign in" : "Create account"}
          </Link>
        </p>
      </section>
    </main>
  );
}
