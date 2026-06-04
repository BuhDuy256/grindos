"use client";

import { useRef, useState } from "react";
import styles from "./TaskList.module.css";

export function InlineEdit({
  value,
  onSave,
  className,
  type = "text",
  suffix = "",
}: {
  value: string;
  onSave: (value: string) => void;
  className?: string;
  type?: string;
  suffix?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  function startEdit() {
    setDraft(value);
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  }

  function commit() {
    setEditing(false);
    const next = draft.trim();
    if (next && next !== value) {
      onSave(next);
    } else {
      setDraft(value);
    }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        className={`${styles.input} ${className ?? ""}`}
        type={type}
        value={draft}
        onBlur={commit}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") commit();
          if (event.key === "Escape") {
            setEditing(false);
            setDraft(value);
          }
        }}
        autoFocus
      />
    );
  }

  return (
    <button type="button" className={className} onClick={startEdit} title="Click to edit">
      {value}{suffix}
    </button>
  );
}
