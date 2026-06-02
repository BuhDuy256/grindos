"use client";

import { useRef, useState } from "react";
import { apiClient } from "@/lib/api-client";

export interface Task {
  id: number;
  plan_id: number;
  parent_id: number | null;
  title: string;
  description: string | null;
  duration_mins: number;
  is_completed: boolean;
  modification_state: string;
  subtasks?: Task[];
}

export function buildTree(flat: Task[]): Task[] {
  const map = new Map<number, Task>();
  flat.forEach((t) => map.set(t.id, { ...t, subtasks: [] }));
  const roots: Task[] = [];
  map.forEach((node) => {
    if (node.parent_id === null) {
      roots.push(node);
    } else {
      map.get(node.parent_id)?.subtasks?.push(node);
    }
  });
  return roots;
}

// ── Inline text input that saves on Enter / blur ──────────────────────────────
function InlineEdit({
  value,
  onSave,
  className,
  inputClassName,
  type = "text",
}: {
  value: string;
  onSave: (v: string) => void;
  className?: string;
  inputClassName?: string;
  type?: string;
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
    if (draft.trim() && draft !== value) onSave(draft.trim());
    else setDraft(value);
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type={type}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") { setEditing(false); setDraft(value); }
        }}
        className={`bg-transparent border-b border-violet-400 outline-none ${inputClassName}`}
        autoFocus
      />
    );
  }

  return (
    <span
      onClick={startEdit}
      title="Click to edit"
      className={`cursor-text hover:underline decoration-dotted underline-offset-2 ${className}`}
    >
      {value}
    </span>
  );
}

// ── Add subtask / task inline form ────────────────────────────────────────────
function AddTaskForm({
  planID,
  parentID,
  onAdd,
  onCancel,
}: {
  planID: number;
  parentID: number | null;
  onAdd: (task: Task) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [mins, setMins] = useState("30");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!title.trim()) return;
    setSaving(true);
    const res = await apiClient.post<Task>("/v1/daily-plan/task", {
      plan_id: planID,
      parent_id: parentID,
      title: title.trim(),
      duration_mins: parseInt(mins) || 30,
    });
    setSaving(false);
    if (!res.error) {
      onAdd(res.data);
      setTitle("");
      setMins("30");
    }
  }

  return (
    <div
      className="flex items-center gap-2 rounded-lg border border-dashed border-violet-300 dark:border-violet-700 px-3 py-2"
      style={{ marginLeft: parentID !== null ? 20 : 0 }}
    >
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") onCancel();
        }}
        placeholder="Task title..."
        className="flex-1 bg-transparent text-sm outline-none placeholder-zinc-400"
      />
      <input
        type="number"
        value={mins}
        onChange={(e) => setMins(e.target.value)}
        className="w-14 bg-transparent text-sm text-right outline-none text-zinc-500"
        min={5}
        step={5}
      />
      <span className="text-xs text-zinc-400">min</span>
      <button
        onClick={submit}
        disabled={saving || !title.trim()}
        className="text-xs font-medium text-violet-600 hover:text-violet-800 disabled:opacity-40"
      >
        Add
      </button>
      <button onClick={onCancel} className="text-xs text-zinc-400 hover:text-zinc-600">
        ✕
      </button>
    </div>
  );
}

// ── Single task row ───────────────────────────────────────────────────────────
function TaskRow({
  task,
  depth,
  onToggle,
  onUpdate,
  onDelete,
  onSubtaskAdded,
}: {
  task: Task;
  depth: number;
  onToggle: (id: number, val: boolean) => void;
  onUpdate: (id: number, title: string, mins: number) => void;
  onDelete: (id: number) => void;
  onSubtaskAdded: (parentID: number, newTask: Task) => void;
}) {
  const [toggling, setToggling] = useState(false);
  const [addingSubtask, setAddingSubtask] = useState(false);

  async function handleToggle() {
    setToggling(true);
    const res = await apiClient.patch<{ is_completed: boolean }>(
      `/v1/daily-plan/task/${task.id}/complete`, {},
    );
    if (!res.error) onToggle(task.id, res.data.is_completed);
    else alert(`Error: ${res.error}`);
    setToggling(false);
  }

  async function handleTitleSave(newTitle: string) {
    const res = await apiClient.patch(`/v1/daily-plan/task/${task.id}`, { title: newTitle });
    if (!res.error) onUpdate(task.id, newTitle, task.duration_mins);
  }

  async function handleMinsSave(raw: string) {
    const mins = parseInt(raw);
    if (!mins || mins === task.duration_mins) return;
    const res = await apiClient.patch(`/v1/daily-plan/task/${task.id}`, { duration_mins: mins });
    if (!res.error) onUpdate(task.id, task.title, mins);
  }

  async function handleDelete() {
    if (!confirm(`Delete "${task.title}"?`)) return;
    const res = await apiClient.delete(`/v1/daily-plan/task/${task.id}`);
    if (!res.error) onDelete(task.id);
    else alert(`Error: ${res.error}`);
  }

  return (
    <>
      <li
        className="group flex items-start gap-3 rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-2.5"
        style={{ marginLeft: depth * 20 }}
      >
        {/* Checkbox */}
        <button
          onClick={handleToggle}
          disabled={toggling}
          className={`mt-0.5 h-4 w-4 shrink-0 rounded border transition-colors ${
            task.is_completed
              ? "border-violet-500 bg-violet-500"
              : "border-zinc-300 hover:border-violet-400 dark:border-zinc-600"
          }`}
        >
          {task.is_completed && (
            <svg viewBox="0 0 10 10" className="w-full h-full text-white" fill="none">
              <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>

        {/* Title + description */}
        <div className="flex-1 min-w-0">
          <InlineEdit
            value={task.title}
            onSave={handleTitleSave}
            className={`text-sm font-medium leading-snug ${task.is_completed ? "line-through text-zinc-400" : "text-zinc-900 dark:text-zinc-100"}`}
            inputClassName="text-sm font-medium w-full"
          />
          {task.description && !task.is_completed && (
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              {task.description}
            </p>
          )}
        </div>

        {/* Duration */}
        <div className="flex items-center gap-1 shrink-0">
          <InlineEdit
            value={String(task.duration_mins)}
            onSave={handleMinsSave}
            type="number"
            className="text-xs text-zinc-400 min-w-[28px] text-right"
            inputClassName="text-xs w-12 text-right"
          />
          <span className="text-xs text-zinc-400">m</span>
        </div>

        {/* Actions — visible on hover */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onClick={() => setAddingSubtask((v) => !v)}
            title="Add subtask"
            className="text-xs text-zinc-400 hover:text-violet-600 px-1"
          >
            +
          </button>
          <button
            onClick={handleDelete}
            title="Delete task"
            className="text-xs text-zinc-400 hover:text-red-500 px-1"
          >
            ✕
          </button>
        </div>
      </li>

      {/* Subtasks */}
      {task.subtasks?.map((sub) => (
        <TaskRow
          key={sub.id}
          task={sub}
          depth={depth + 1}
          onToggle={onToggle}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onSubtaskAdded={onSubtaskAdded}
        />
      ))}

      {/* Add subtask form */}
      {addingSubtask && (
        <AddTaskForm
          planID={task.plan_id}
          parentID={task.id}
          onAdd={(newTask) => {
            onSubtaskAdded(task.id, newTask);
            setAddingSubtask(false);
          }}
          onCancel={() => setAddingSubtask(false)}
        />
      )}
    </>
  );
}

// ── Root list ─────────────────────────────────────────────────────────────────
export function TaskList({
  tasks: initialTasks,
  planID,
}: {
  tasks: Task[];
  planID: number;
}) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [addingRoot, setAddingRoot] = useState(false);

  function handleToggle(id: number, val: boolean) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, is_completed: val } : t)));
  }

  function handleUpdate(id: number, title: string, mins: number) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, title, duration_mins: mins } : t)));
  }

  function handleDelete(id: number) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  function handleSubtaskAdded(parentID: number, newTask: Task) {
    setTasks((prev) => [...prev, newTask]);
  }

  function handleRootAdded(newTask: Task) {
    setTasks((prev) => [...prev, newTask]);
    setAddingRoot(false);
  }

  const tree = buildTree(tasks);

  return (
    <div className="space-y-2">
      <ul className="space-y-2">
        {tree.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            depth={0}
            onToggle={handleToggle}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
            onSubtaskAdded={handleSubtaskAdded}
          />
        ))}
      </ul>

      {addingRoot ? (
        <AddTaskForm
          planID={planID}
          parentID={null}
          onAdd={handleRootAdded}
          onCancel={() => setAddingRoot(false)}
        />
      ) : (
        <button
          onClick={() => setAddingRoot(true)}
          className="w-full text-sm text-zinc-400 hover:text-violet-600 py-2 rounded-lg border border-dashed border-zinc-200 dark:border-zinc-700 hover:border-violet-300 transition-colors"
        >
          + Add task
        </button>
      )}
    </div>
  );
}
