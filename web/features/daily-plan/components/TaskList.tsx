"use client";

import { useMemo, useState } from "react";
import { addDays, formatTaskDate } from "../date";
import type { Task } from "../types";
import { AddTaskForm, type AddTaskFormInput } from "./AddTaskForm";
import { buildTaskTree } from "./TaskTree";
import { TaskRow } from "./TaskRow";
import styles from "./TaskList.module.css";

interface TaskListProps {
  tasks: Task[];
  date: string;
  todayDate: string;
  onDateChange: (date: string) => void;
  onToggleTask?: (task: Task, isCompleted: boolean) => void | Promise<void>;
  onUpdateTaskTitle?: (task: Task, title: string) => void | Promise<void>;
  onUpdateTaskDuration?: (task: Task, durationMins: number) => void | Promise<void>;
  onDeleteTask?: (task: Task) => void | Promise<void>;
  onAddTask?: (parentId: string | null, input: AddTaskFormInput) => void | Promise<void>;
}

export function TaskList({
  tasks,
  date,
  todayDate,
  onDateChange,
  onToggleTask,
  onUpdateTaskTitle,
  onUpdateTaskDuration,
  onDeleteTask,
  onAddTask,
}: TaskListProps) {
  const [addingRoot, setAddingRoot] = useState(false);
  const [completedExpanded, setCompletedExpanded] = useState(
    () => tasks.filter((task) => task.is_completed).length <= 4,
  );
  const completedCount = useMemo(
    () => tasks.filter((task) => task.is_completed).length,
    [tasks],
  );
  const pendingCount = tasks.length - completedCount;
  const pendingTree = useMemo(
    () => buildTaskTree(tasks.filter((task) => !task.is_completed)),
    [tasks],
  );
  const completedTree = useMemo(
    () => buildTaskTree(tasks.filter((task) => task.is_completed)),
    [tasks],
  );
  const isToday = date === todayDate;

  function changeDate(days: number) {
    onDateChange(addDays(date, days));
  }

  return (
    <div className={styles.listWrap}>
      <header className={styles.header}>
        <h1 className={styles.pageTitle}>
          Task <span>{formatTaskDate(date)}</span>
        </h1>
        <div className={styles.dateNav} aria-label="Task date navigation">
          <button
            type="button"
            className={styles.dateNavButton}
            onClick={() => changeDate(-1)}
            aria-label="Previous day"
          >
            &#8249;
          </button>
          <button
            type="button"
            className={`${styles.todayButton} ${isToday ? styles.todayButtonActive : ""}`}
            onClick={() => onDateChange(todayDate)}
            disabled={isToday}
          >
            Today
          </button>
          <button
            type="button"
            className={styles.dateNavButton}
            onClick={() => changeDate(1)}
            aria-label="Next day"
          >
            &#8250;
          </button>
        </div>
      </header>

      <div className={styles.summaryRow}>
        <p className={styles.headerMeta}>
          {pendingCount} pending / {completedCount} completed
        </p>
        {!addingRoot && onAddTask ? (
          <button
            className={styles.headerAddButton}
            onClick={() => setAddingRoot(true)}
          >
            + Add task
          </button>
        ) : null}
      </div>

      <div className={styles.rule} />

      <div className={styles.scrollArea}>
        {addingRoot && onAddTask ? (
          <AddTaskForm
            onAdd={(input) => onAddTask(null, input)}
            onCancel={() => setAddingRoot(false)}
          />
        ) : null}

        {pendingTree.length > 0 ? (
          <ul className={styles.list}>
            {pendingTree.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                date={date}
                depth={0}
                onToggle={onToggleTask}
                onUpdateTitle={onUpdateTaskTitle}
                onUpdateDuration={onUpdateTaskDuration}
                onDelete={onDeleteTask}
                onAddTask={onAddTask}
              />
            ))}
          </ul>
        ) : (
          <div className={styles.emptyState}>
            <p>All clear for now.</p>
            <span>Add a task or unfold completed work below.</span>
          </div>
        )}

        {completedCount > 0 ? (
          <div className={styles.completedSection}>
            <div className={styles.completedHeader}>
              <div className={styles.completedHeaderLeft}>
                <h2 className={styles.completedTitle}>Ho&#224;n th&#224;nh</h2>
                <span className={styles.completedCount}>{completedCount}</span>
              </div>
              <button
                type="button"
                className={styles.completedToggle}
                onClick={() => setCompletedExpanded((value) => !value)}
                aria-expanded={completedExpanded}
              >
                {completedExpanded ? "Collapse" : "Expand"}
              </button>
            </div>
            {completedExpanded ? (
              <ul className={styles.completedList}>
                {completedTree.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    date={date}
                    depth={0}
                    onToggle={onToggleTask}
                    onUpdateTitle={onUpdateTaskTitle}
                    onUpdateDuration={onUpdateTaskDuration}
                    onDelete={onDeleteTask}
                    onAddTask={onAddTask}
                  />
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
