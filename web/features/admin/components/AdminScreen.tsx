"use client";

import { TaskList } from "@/features/daily-plan/components/TaskList";
import { AppShell } from "@/features/shell/components/AppShell";
import { UserSwitcher } from "@/features/user/components/UserSwitcher";
import { addDays, useAdminDashboard } from "../hooks/useAdminDashboard";
import styles from "./AdminScreen.module.css";

function StatBox({
  label,
  value,
  delta,
}: {
  label: string;
  value: string | number;
  delta?: number;
}) {
  return (
    <div className={styles.card}>
      <p className={styles.label}>{label}</p>
      <p className={styles.value}>{value}</p>
      {delta !== undefined && delta !== 0 ? (
        <span className={styles.delta}>{delta > 0 ? `+${delta}` : delta}</span>
      ) : null}
    </div>
  );
}

export function AdminScreen() {
  const admin = useAdminDashboard();
  const completedCount = admin.plan?.tasks.filter((task) => task.is_completed).length ?? 0;
  const totalCount = admin.plan?.tasks.length ?? 0;
  const hasAiTasks = admin.plan?.tasks.some((t) => t.origin_type === "SYSTEM_GENERATED") ?? false;
  const learningDone = admin.plan?.ecr_score !== null && admin.plan?.ecr_score !== undefined;

  return (
    <AppShell>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Developer mode</p>
          <h1 className={styles.title}>Admin panel</h1>
        </div>
        <div className={styles.toolbar}>
          <UserSwitcher userId={admin.userId} onSwitch={admin.setUserId} />
          <button className={styles.ghostButton} onClick={() => admin.setSimDate(addDays(admin.simDate, -1))}>Prev</button>
          <button className={styles.ghostButton} onClick={() => admin.setSimDate(admin.today)}>Today</button>
          <button className={styles.ghostButton} onClick={() => admin.setSimDate(addDays(admin.simDate, 1))}>Next</button>
        </div>
      </header>

      <section className={styles.grid}>
        <StatBox label="Level" value={admin.stats?.level ?? "-"} />
        <StatBox label="EXP" value={admin.stats?.exp ?? "-"} delta={admin.prevStats && admin.stats ? admin.stats.exp - admin.prevStats.exp : undefined} />
        <StatBox label="Streak" value={admin.stats ? `${admin.stats.streak}d` : "-"} />
        <StatBox label="Tasks" value={admin.plan ? `${completedCount}/${totalCount}` : "-"} />
        <StatBox label="STR" value={admin.stats?.str_stat ?? "-"} />
        <StatBox label="INT" value={admin.stats?.int_stat ?? "-"} />
        <StatBox label="VIT" value={admin.stats?.vit_stat ?? "-"} />
        <StatBox label="Multi" value={admin.stats?.difficulty_multiplier ?? "-"} />
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2 className={styles.panelTitle}>Tasks for {admin.simDate}</h2>
          {admin.plan?.ecr_score !== null && admin.plan?.ecr_score !== undefined ? (
            <span className={styles.muted}>ECR {admin.plan.ecr_score}%</span>
          ) : null}
        </div>
        {admin.plan && admin.plan.tasks.length > 0 ? (
          <TaskList
            key={admin.plan.id}
            tasks={admin.plan.tasks}
            date={admin.simDate}
            todayDate={admin.today}
            onDateChange={admin.setSimDate}
          />
        ) : (
          <p className={styles.muted}>
            {admin.loading ? "Loading..." : `No plan for ${admin.simDate}.`}
          </p>
        )}
      </section>

      {admin.plan ? (
        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>End-of-day feedback</h2>
          <textarea
            className={styles.textarea}
            value={admin.note}
            onChange={(event) => admin.setNote(event.target.value)}
            placeholder="How did today go?"
          />
          <button className={styles.button} disabled={admin.noteSaving} onClick={admin.saveNote}>
            {admin.noteSaving ? "Saving..." : "Save feedback"}
          </button>
        </section>
      ) : null}

      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>Actions</h2>
        <div className={styles.actions}>
          <button className={styles.button} disabled={hasAiTasks} onClick={admin.executeThinking}>
            {hasAiTasks ? "Thinking already run" : "Run Thinking"}
          </button>
          <button className={styles.button} disabled={!admin.plan || learningDone} onClick={admin.executeLearning}>
            {!admin.plan ? "Run Learning needs a plan" : learningDone ? "Learning already run" : "Run Learning"}
          </button>
          <button className={styles.dangerButton} onClick={admin.executeReset}>
            Reset user to Day 1
          </button>
        </div>
        {admin.message ? <p className={styles.message}>{admin.message}</p> : null}
      </section>
    </AppShell>
  );
}
