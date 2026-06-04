import type { Task } from "../types";

export function buildTaskTree(flat: Task[]): Task[] {
  const map = new Map<string, Task>();
  flat.forEach((task) => map.set(task.id, { ...task, subtasks: [] }));

  const roots: Task[] = [];
  map.forEach((node) => {
    if (node.parent_id === null || !map.has(node.parent_id)) {
      roots.push(node);
      return;
    }

    map.get(node.parent_id)?.subtasks?.push(node);
  });

  return roots;
}
