# Daily Plan Logic (Frontend Architecture)

This document explains the architecture and data flow for the **Daily Plan** feature. It is designed to help Frontend Developers quickly understand how the feature works, where to find specific logic, and how to safely modify the code.

## 📂 File Structure Overview

All logic related to the Daily Plan is encapsulated within `web/features/daily-plan/`.

```text
web/
├── app/daily-plan/page.tsx                   # Next.js route entry point
└── features/daily-plan/
    ├── components/
    │   ├── DailyPlanScreen.tsx               # Main container component
    │   ├── TaskList.tsx                      # Task list manager (handles local state & trees)
    │   ├── TaskRow.tsx                       # Individual task item (handles mutations)
    │   ├── TaskTree.ts                       # Utility to build task hierarchy
    │   ├── AddTaskForm.tsx                   # Form to add new tasks/subtasks
    │   └── InlineEdit.tsx                    # Reusable inline text/number editor
    ├── hooks/
    │   └── useDailyPlan.ts                   # Fetches initial plan data and manages notes
    ├── services/
    │   └── dailyPlanService.ts               # API fetch wrappers
    └── types.ts                              # TypeScript interfaces (Task, DailyPlan)
```

## 🔄 Data Flow & State Management

The Daily Plan feature uses a combination of **Global Fetching** (for the initial load) and **Local State Updates** (for optimistic UI and immediate interaction).

### 1. Initialization (`useDailyPlan.ts`)
- The `useDailyPlan` hook is responsible for the initial data fetch.
- It calculates today's date (`YYYY-MM-DD` via `en-CA` locale) and calls `getDailyPlan` from the service.
- It manages the loading state, the overall `plan` object, and the state for the "End-of-day note".

### 2. Main Screen (`DailyPlanScreen.tsx`)
- Calls `useDailyPlan()` to get the data.
- Handles the loading UI, empty state (if no plan exists), and renders the top-level AI analysis (`system_message`, `progress_analysis`) and the end-of-day note section.
- Passes the `plan.tasks` array down to `TaskList`.

### 3. Task List Management (`TaskList.tsx`)
- **Local State**: Receives the initial array of tasks from the screen, but stores them in a local `useState<Task[]>` hook.
- **Tree Building**: Uses the `buildTaskTree` utility to transform the flat array of tasks into a hierarchical tree based on `parent_id`. It separates them into two trees:
  - `pendingTree`: Tasks where `is_completed` is false.
  - `completedTree`: Tasks where `is_completed` is true.
- **State Handlers**: Provides callback functions (`handleToggle`, `handleUpdate`, `handleDelete`, `handleAdd`) that update the *local* state array. These callbacks are passed down to the individual `TaskRow` components.

### 4. Task Interactions (`TaskRow.tsx`)
- **Rendering**: Displays the task details and recursively renders any `subtasks`.
- **Mutations**: When a user interacts with a task (toggles a checkbox, edits text, deletes), the `TaskRow` does the following:
  1. Calls the actual API directly via `dailyPlanService.ts` (e.g., `await toggleTaskComplete(task.id)`).
  2. Waits for the API to respond successfully (no error).
  3. Calls the callback passed from `TaskList` (e.g., `onToggle(task.id, res.data.is_completed)`) to update the parent's local state and trigger a re-render.
- **Inline Editing**: Uses `InlineEdit.tsx` to handle changing the title or duration. It only fires the update API if the value actually changes.

## 🛠️ How to Debug / Modify

### If tasks are not loading or the wrong date is fetched:
- Check `hooks/useDailyPlan.ts`. The date is hardcoded to the local timezone's date string.

### If task hierarchy (parent/child) is rendering incorrectly:
- Check `components/TaskTree.ts` where the flat array is mapped into nested objects.
- Ensure `parent_id` is correctly assigned in the API response.

### If a task update (toggle, rename, delete) fails or doesn't reflect in the UI:
- Check `components/TaskRow.tsx`. Look at the specific handler (e.g., `handleToggle`).
- Ensure the API call in `services/dailyPlanService.ts` is succeeding.
- Ensure the callback (e.g., `onToggle`) is being fired correctly after the API response.
- Verify that `components/TaskList.tsx` correctly updates its local state array inside the respective handler function.

### If adding a task/subtask fails:
- Check `components/AddTaskForm.tsx` for the creation logic.
- Notice how it uses optimistic "pending" tasks (`tempId`) while waiting for the server response, and then calls `onConfirm` or `onRollback` to reconcile with the true server state.
