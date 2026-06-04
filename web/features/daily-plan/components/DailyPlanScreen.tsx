"use client";

import { useRef, useState } from "react";
import { MochiEffectsProvider } from "@/features/mochi-rescue/providers/MochiEffectsProvider";
import { AppShell } from "@/features/shell/components/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { todayISO } from "../date";
import { useTaskCompletionController } from "../controllers/useTaskCompletionController";
import { useDailyPlan } from "../hooks/useDailyPlan";
import { useDailyPlanMutations } from "../hooks/useDailyPlanMutations";
import type { DailyPlan, Task } from "../types";
import { TaskList } from "./TaskList";
import type { AddTaskFormInput } from "./AddTaskForm";
import styles from "./DailyPlanScreen.module.css";

function EndOfDayNotePanel({
  noteSaving,
  onSave,
  plan,
}: {
  noteSaving: boolean;
  onSave: (userNote: string) => Promise<void>;
  plan: DailyPlan;
}) {
  const [noteCollapsed, setNoteCollapsed] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);
  const [noteDraft, setNoteDraft] = useState(plan.user_note ?? "");
  const noteDragStartYRef = useRef(0);

  function handleNoteHandlePointerDown(event: React.PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    noteDragStartYRef.current = event.clientY;

    function handlePointerUp(pointerEvent: PointerEvent) {
      const deltaY = pointerEvent.clientY - noteDragStartYRef.current;
      if (Math.abs(deltaY) < 12) {
        setNoteCollapsed((collapsed) => !collapsed);
        return;
      }
      setNoteCollapsed(deltaY > 0);
    }

    window.addEventListener("pointerup", handlePointerUp, { once: true });
  }

  async function handleSave() {
    await onSave(noteDraft);
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2000);
  }

  return (
    <section
      className={`${styles.notePanel} ${noteCollapsed ? styles.notePanelCollapsed : ""}`}
    >
      <button
        type="button"
        className={styles.noteCollapseButton}
        onPointerDown={handleNoteHandlePointerDown}
        aria-label={noteCollapsed ? "Expand end-of-day note" : "Collapse end-of-day note"}
        aria-expanded={!noteCollapsed}
        title={noteCollapsed ? "Expand note" : "Collapse note"}
      >
        <span className="material-symbols-outlined" aria-hidden="true">
          {noteCollapsed ? "keyboard_arrow_up" : "keyboard_arrow_down"}
        </span>
      </button>
      <div className={styles.noteHeader}>
        <div>
          <h2 className={styles.sectionTitle}>End-of-day note</h2>
          {!noteCollapsed ? (
            <p className={styles.noteHint} id="note-hint">
              Capture blockers, wins, and tomorrow&apos;s first move.
            </p>
          ) : null}
        </div>
        <span className={styles.noteStatus} aria-live="polite">
          {noteSaving ? "Saving..." : noteSaved ? "Saved" : ""}
        </span>
      </div>
      {noteCollapsed ? (
        <p className={styles.notePreview}>
          {noteDraft.trim() || "No note yet."}
        </p>
      ) : (
        <>
          <textarea
            className={styles.textarea}
            value={noteDraft}
            onChange={(event) => setNoteDraft(event.target.value)}
            placeholder="How did today go? Any blockers?"
          />
          <div className={styles.noteActions}>
            <button
              className={styles.saveButton}
              disabled={noteSaving}
              onClick={() => void handleSave()}
            >
              {noteSaving ? "Saving..." : "Save note"}
            </button>
          </div>
        </>
      )}
    </section>
  );
}

function DailyPlanContent({
  selectedDate,
  setSelectedDate,
  userId,
}: {
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  userId: string;
}) {
  const [today] = useState(() => todayISO());
  const { plan, isPending, isFetching, error } = useDailyPlan(userId, selectedDate);
  const mutations = useDailyPlanMutations();
  const controllerPlan: DailyPlan = plan ?? {
    id: "",
    date: selectedDate,
    system_message: null,
    progress_analysis: null,
    ecr_score: null,
    user_note: null,
    tasks: [],
  };
  const taskCompletionController = useTaskCompletionController({
    date: selectedDate,
    onToggleTask: handleToggleTask,
    plan: controllerPlan,
  });

  async function saveNote(planForSave: DailyPlan, userNote: string) {
    await mutations.saveNote.mutateAsync({
      userId,
      date: planForSave.date,
      userNote,
    });
  }

  async function handleToggleTask(task: Task, isCompleted: boolean) {
    await mutations.toggleTask.mutateAsync({
      userId,
      date: selectedDate,
      taskId: task.id,
      isCompleted,
    });
  }

  async function handleUpdateTaskTitle(task: Task, title: string) {
    await mutations.updateTaskTitle.mutateAsync({
      userId,
      date: selectedDate,
      taskId: task.id,
      title,
    });
  }

  async function handleUpdateTaskDuration(task: Task, durationMins: number) {
    await mutations.updateTaskDuration.mutateAsync({
      userId,
      date: selectedDate,
      taskId: task.id,
      durationMins,
    });
  }

  async function handleDeleteTask(task: Task) {
    await mutations.deleteTask.mutateAsync({
      userId,
      date: selectedDate,
      taskId: task.id,
    });
  }

  async function handleAddTask(planForAdd: DailyPlan, parentId: string | null, input: AddTaskFormInput) {
    await mutations.addTask.mutateAsync({
      userId,
      date: planForAdd.date,
      planId: planForAdd.id,
      parentId,
      title: input.title,
      durationMins: input.durationMins,
    });
  }

  if (isPending) {
    return (
      <AppShell>
        <div className={styles.loading}>Loading...</div>
      </AppShell>
    );
  }

  if (!plan) {
    return (
      <AppShell>
        <div className={styles.emptyWrap}>
          <div className={styles.empty}>
            <h1 className={styles.sectionTitle}>No plan for {selectedDate}</h1>
            <p className={styles.muted}>
              {error instanceof Error ? error.message : "Ask an admin to run Thinking for this account."}
            </p>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell dailyPlanContext={{ userId, date: selectedDate }}>
      <div className={styles.screen}>
        <div className={styles.taskRegion}>
          {isFetching ? <div className={styles.fetching}>Syncing...</div> : null}

          {plan.system_message ? (
            <div className={styles.notice}>{plan.system_message}</div>
          ) : null}

          <TaskList
            key={plan.id}
            tasks={plan.tasks}
            date={selectedDate}
            todayDate={today}
            onDateChange={setSelectedDate}
            onToggleTask={taskCompletionController.toggleTask}
            onUpdateTaskTitle={handleUpdateTaskTitle}
            onUpdateTaskDuration={handleUpdateTaskDuration}
            onDeleteTask={handleDeleteTask}
            onAddTask={(parentId, input) => handleAddTask(plan, parentId, input)}
          />

          {plan.progress_analysis ? (
            <section className={styles.analysis}>
              <h2 className={styles.sectionTitle}>AI analysis</h2>
              <p className={styles.muted}>{plan.progress_analysis}</p>
            </section>
          ) : null}
        </div>

        <EndOfDayNotePanel
          key={plan.id}
          noteSaving={mutations.saveNote.isPending}
          onSave={(userNote) => saveNote(plan, userNote)}
          plan={plan}
        />
      </div>
    </AppShell>
  );
}

export function DailyPlanScreen() {
  const { user, loading } = useAuth();
  const [selectedDate, setSelectedDate] = useState(() => todayISO());

  if (loading) {
    return (
      <AppShell>
        <div className={styles.loading}>Loading...</div>
      </AppShell>
    );
  }

  if (!user) {
    return (
      <AppShell>
        <div className={styles.emptyWrap}>
          <div className={styles.empty}>
            <h1 className={styles.sectionTitle}>Not signed in</h1>
            <p className={styles.muted}>Sign in to view your daily plan.</p>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <MochiEffectsProvider resetKey={`${user.id}:${selectedDate}`}>
      <DailyPlanContent
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        userId={user.id}
      />
    </MochiEffectsProvider>
  );
}
