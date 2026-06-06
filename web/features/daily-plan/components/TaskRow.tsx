"use client";

import { useEffect, useRef, useState } from "react";
import type { Task } from "../types";
import { AddTaskForm, type AddTaskFormInput } from "./AddTaskForm";
import { InlineEdit } from "./InlineEdit";
import { useTaskFocusTimer } from "../hooks/useTaskFocusTimer";
import styles from "./TaskList.module.css";

interface TaskRowProps {
  task: Task;
  date: string;
  depth: number;
  onToggle?: (task: Task, isCompleted: boolean) => void | Promise<void>;
  onUpdateTitle?: (task: Task, title: string) => void | Promise<void>;
  onUpdateDuration?: (task: Task, durationMins: number) => void | Promise<void>;
  onDelete?: (task: Task) => void | Promise<void>;
  onAddTask?: (parentId: string | null, input: AddTaskFormInput) => void | Promise<void>;
}

export function TaskRow({
  task,
  date,
  depth,
  onToggle,
  onUpdateTitle,
  onUpdateDuration,
  onDelete,
  onAddTask,
}: TaskRowProps) {
  const {
    activeTaskId,
    startedAt,
    elapsedBeforeStart,
    isRunning,
    handleStart,
    handleStop,
    isSaving,
  } = useTaskFocusTimer();

  const isActive = activeTaskId === task.id && isRunning;
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!isActive || !startedAt) return;
    setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000) + elapsedBeforeStart);

    const id = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000) + elapsedBeforeStart);
    }, 1000);
    return () => clearInterval(id);
  }, [isActive, startedAt, elapsedBeforeStart]);

  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [addingSubtask, setAddingSubtask] = useState(false);
  const isPending = String(task.id).startsWith("temp-");
  const mountedRef = useRef(true);
  const rowClassName = [
    styles.row,
    task.is_completed ? styles.rowCompleted : "",
    isPending ? styles.rowPending : "",
    depth > 0 ? styles.rowNested : "",
  ].filter(Boolean).join(" ");

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  async function handleToggle() {
    if (toggling || isPending || !onToggle) return;
    setToggling(true);
    try {
      await onToggle(task, !task.is_completed);
    } catch {
      // Cache rollback is handled by the mutation layer.
    } finally {
      if (mountedRef.current) {
        setToggling(false);
      }
    }
  }

  function handleTitleSave(title: string) {
    if (!onUpdateTitle) return;
    void Promise.resolve(onUpdateTitle(task, title)).catch(() => {
      // Cache rollback is handled by the mutation layer.
    });
  }

  function handleMinsSave(raw: string) {
    const mins = Number.parseInt(raw, 10);
    if (!mins || mins === task.duration_mins || !onUpdateDuration) return;
    void Promise.resolve(onUpdateDuration(task, mins)).catch(() => {
      // Cache rollback is handled by the mutation layer.
    });
  }

  async function handleDelete() {
    if (deleting || isPending || !onDelete) return;
    setDeleting(true);
    try {
      await onDelete(task);
    } catch {
      // Cache rollback is handled by the mutation layer.
    } finally {
      if (mountedRef.current) {
        setDeleting(false);
      }
    }
  }

  function handleStartFocusTimer() {
    handleStart(task.id, task.title, task.duration_mins, date, task.focus_time_seconds || 0);
  }

  function handleStopFocusTimer() {
    handleStop();
  }

  const totalFocusedSeconds = isActive ? elapsedSeconds : (task.focus_time_seconds || 0);
  const remainingSeconds = Math.max(0, task.duration_mins * 60 - totalFocusedSeconds);
  const mm = String(Math.floor(remainingSeconds / 60)).padStart(2, "0");
  const ss = String(remainingSeconds % 60).padStart(2, "0");

  return (
    <>
      <li
        className={rowClassName}
        style={{
          marginLeft: depth * 28,
          background: isActive ? "var(--color-accent-amber)" : undefined,
        }}
      >
        <button
          type="button"
          className={`${styles.checkbox} ${task.is_completed ? styles.checkboxComplete : ""}`}
          disabled={toggling || isPending || !onToggle}
          onClick={handleToggle}
          aria-label={task.is_completed ? "Mark incomplete" : "Mark complete"}
        >
          {task.is_completed ? (
            <span className="material-symbols-outlined" aria-hidden="true">
              check
            </span>
          ) : null}
        </button>

        <div className={styles.titleCell}>
          <InlineEdit
            value={task.title}
            onSave={handleTitleSave}
            className={`${styles.title} ${task.is_completed ? styles.titleComplete : ""}`}
          />
          {task.description && !task.is_completed ? (
            <p className={styles.description}>{task.description}</p>
          ) : null}
        </div>

        <div className={styles.duration}>
          {isActive ? (
            <span style={{ fontSize: "12px", marginRight: "4px", marginTop: "auto", marginBottom: "auto" }}>
              {mm}:{ss}/
            </span>
          ) : null}
          <InlineEdit
            value={String(task.duration_mins)}
            onSave={handleMinsSave}
            type="number"
            className={styles.durationValue}
            suffix=" min"
          />
        </div>

        {task.is_completed ? null : isActive ? (
          <button
            type="button"
            className={styles.taskTimerButton}
            disabled={isPending || isSaving}
            onClick={handleStopFocusTimer}
            aria-label={`Stop timer for ${task.title}`}
            title="Stop focus timer"
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              stop
            </span>
          </button>
        ) : (
          <button
            type="button"
            className={styles.taskTimerButton}
            disabled={isPending}
            onClick={handleStartFocusTimer}
            aria-label={`Start ${task.duration_mins} minute timer for ${task.title}`}
            title="Start focus timer"
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              play_arrow
            </span>
          </button>
        )}

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.iconButton}
            disabled={isPending || !onAddTask}
            onClick={() => setAddingSubtask((value) => !value)}
            aria-label="Add subtask"
          >
            +
          </button>
          <button
            type="button"
            className={styles.deleteButton}
            disabled={isPending || deleting || !onDelete}
            onClick={handleDelete}
            aria-label="Delete task"
          >
            x
          </button>
        </div>
      </li>

      {addingSubtask && onAddTask ? (
        <li className={styles.formListItem}>
          <AddTaskForm
            indentDepth={depth + 1}
            onAdd={(input) => onAddTask(task.id, input)}
            onCancel={() => setAddingSubtask(false)}
          />
        </li>
      ) : null}

      {task.subtasks?.map((subtask) => (
        <TaskRow
          key={subtask.id}
          task={subtask}
          date={date}
          depth={depth + 1}
          onToggle={onToggle}
          onUpdateTitle={onUpdateTitle}
          onUpdateDuration={onUpdateDuration}
          onDelete={onDelete}
          onAddTask={onAddTask}
        />
      ))}
    </>
  );
}
