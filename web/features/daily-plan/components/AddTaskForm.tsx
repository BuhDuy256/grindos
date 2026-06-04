"use client";

import { useState } from "react";
import styles from "./TaskList.module.css";

export interface AddTaskFormInput {
  title: string;
  durationMins: number;
}

interface AddTaskFormProps {
  indentDepth?: number;
  onAdd: (input: AddTaskFormInput) => void | Promise<void>;
  onCancel: () => void;
}

export function AddTaskForm({
  onAdd,
  onCancel,
  indentDepth = 0,
}: AddTaskFormProps) {
  const [title, setTitle] = useState("");
  const [mins, setMins] = useState("30");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!title.trim() || submitting) return;

    const durationMins = Number.parseInt(mins, 10) || 30;
    setSubmitting(true);
    try {
      await onAdd({
        title: title.trim(),
        durationMins,
      });
      setTitle("");
      setMins("30");
      onCancel();
    } catch {
      // Rollback is handled by the mutation layer; keep the draft for retry.
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      className={styles.form}
      style={{ marginLeft: indentDepth * 28 }}
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <input
        className={styles.textInput}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") onCancel();
        }}
        placeholder="Task title..."
        autoFocus
      />
      <input
        className={styles.numberInput}
        type="number"
        min={5}
        step={5}
        value={mins}
        onChange={(event) => setMins(event.target.value)}
      />
      <button className={styles.formButton} type="submit" disabled={!title.trim() || submitting}>
        {submitting ? "Adding..." : "Add"}
      </button>
      <button className={styles.cancelButton} type="button" onClick={onCancel}>
        Cancel
      </button>
    </form>
  );
}
