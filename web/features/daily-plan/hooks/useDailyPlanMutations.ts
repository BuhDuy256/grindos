"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createTask,
  deleteTask,
  saveEndDayNote,
  saveTaskFocusTime,
  toggleTaskComplete,
  updateTask,
} from "../services/dailyPlanService";
import { statsQueryKeys } from "@/features/stats/hooks/useStatsData";
import type { DailyPlan, Task } from "../types";
import { dailyPlanKeys } from "../queries/dailyPlanKeys";

type PlanSnapshot = DailyPlan | undefined;

interface MutationContext {
  previous: PlanSnapshot;
}

interface AddTaskContext extends MutationContext {
  tempId: string;
}

interface DailyPlanPayload {
  userId: string;
  date: string;
}

export interface ToggleTaskPayload extends DailyPlanPayload {
  taskId: string;
  isCompleted: boolean;
}

export interface UpdateTaskTitlePayload extends DailyPlanPayload {
  taskId: string;
  title: string;
}

export interface UpdateTaskDurationPayload extends DailyPlanPayload {
  taskId: string;
  durationMins: number;
}

export interface DeleteTaskPayload extends DailyPlanPayload {
  taskId: string;
}

export interface AddTaskPayload extends DailyPlanPayload {
  planId: string;
  parentId: string | null;
  title: string;
  durationMins: number;
}

export interface SaveNotePayload extends DailyPlanPayload {
  userNote: string;
}

export interface SaveFocusTimePayload extends DailyPlanPayload {
  taskId: string;
  elapsedSeconds: number;
}

function replaceTask(tasks: Task[], taskId: string, updater: (task: Task) => Task): Task[] {
  return tasks.map((task) => (task.id === taskId ? updater(task) : task));
}

function updatePlanTasks(plan: DailyPlan | undefined, updater: (tasks: Task[]) => Task[]) {
  if (!plan) {
    return plan;
  }

  return {
    ...plan,
    tasks: updater(plan.tasks),
  };
}

function dailyPlanQueryKey(payload: DailyPlanPayload) {
  return dailyPlanKeys.detail(payload.userId, payload.date);
}

function throwOnApiError<T>(result: { data: T | null; error: string | null }): T {
  if (result.error || !result.data) {
    throw new Error(result.error ?? "Request failed");
  }

  return result.data;
}

export function useDailyPlanMutations() {
  const queryClient = useQueryClient();

  const toggleTask = useMutation({
    mutationFn: async (payload: ToggleTaskPayload) =>
      throwOnApiError(await toggleTaskComplete(payload.taskId)),
    onMutate: async (payload) => {
      const queryKey = dailyPlanQueryKey(payload);
      await queryClient.cancelQueries({ queryKey, exact: true });
      const previous = queryClient.getQueryData<DailyPlan>(queryKey);

      queryClient.setQueryData<DailyPlan>(queryKey, (plan) =>
        updatePlanTasks(plan, (tasks) =>
          replaceTask(tasks, payload.taskId, (task) => ({
            ...task,
            is_completed: payload.isCompleted,
          })),
        ),
      );

      return { previous } satisfies MutationContext;
    },
    onError: (_error, payload, context) => {
      if (context?.previous) {
        queryClient.setQueryData(dailyPlanQueryKey(payload), context.previous);
      }
    },
    onSuccess: (result, payload) => {
      const queryKey = dailyPlanQueryKey(payload);
      queryClient.setQueryData<DailyPlan>(queryKey, (plan) =>
        updatePlanTasks(plan, (tasks) =>
          replaceTask(tasks, payload.taskId, (task) => ({
            ...task,
            is_completed: result.is_completed,
          })),
        ),
      );
      void queryClient.invalidateQueries({
        queryKey: statsQueryKeys.profile(payload.userId),
      });
    },
  });

  const updateTaskTitle = useMutation({
    mutationFn: async (payload: UpdateTaskTitlePayload) =>
      throwOnApiError(await updateTask(payload.taskId, { title: payload.title })),
    onMutate: async (payload) => {
      const queryKey = dailyPlanQueryKey(payload);
      await queryClient.cancelQueries({ queryKey, exact: true });
      const previous = queryClient.getQueryData<DailyPlan>(queryKey);

      queryClient.setQueryData<DailyPlan>(queryKey, (plan) =>
        updatePlanTasks(plan, (tasks) =>
          replaceTask(tasks, payload.taskId, (task) => ({
            ...task,
            title: payload.title,
          })),
        ),
      );

      return { previous } satisfies MutationContext;
    },
    onError: (_error, payload, context) => {
      if (context?.previous) {
        queryClient.setQueryData(dailyPlanQueryKey(payload), context.previous);
      }
    },
  });

  const updateTaskDuration = useMutation({
    mutationFn: async (payload: UpdateTaskDurationPayload) =>
      throwOnApiError(await updateTask(payload.taskId, { duration_mins: payload.durationMins })),
    onMutate: async (payload) => {
      const queryKey = dailyPlanQueryKey(payload);
      await queryClient.cancelQueries({ queryKey, exact: true });
      const previous = queryClient.getQueryData<DailyPlan>(queryKey);

      queryClient.setQueryData<DailyPlan>(queryKey, (plan) =>
        updatePlanTasks(plan, (tasks) =>
          replaceTask(tasks, payload.taskId, (task) => ({
            ...task,
            duration_mins: payload.durationMins,
          })),
        ),
      );

      return { previous } satisfies MutationContext;
    },
    onError: (_error, payload, context) => {
      if (context?.previous) {
        queryClient.setQueryData(dailyPlanQueryKey(payload), context.previous);
      }
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (payload: DeleteTaskPayload) =>
      throwOnApiError(await deleteTask(payload.taskId)),
    onMutate: async (payload) => {
      const queryKey = dailyPlanQueryKey(payload);
      await queryClient.cancelQueries({ queryKey, exact: true });
      const previous = queryClient.getQueryData<DailyPlan>(queryKey);

      queryClient.setQueryData<DailyPlan>(queryKey, (plan) =>
        updatePlanTasks(plan, (tasks) => tasks.filter((task) => task.id !== payload.taskId)),
      );

      return { previous } satisfies MutationContext;
    },
    onError: (_error, payload, context) => {
      if (context?.previous) {
        queryClient.setQueryData(dailyPlanQueryKey(payload), context.previous);
      }
    },
  });

  const addTask = useMutation({
    mutationFn: async (payload: AddTaskPayload) =>
      throwOnApiError(
        await createTask({
          planId: payload.planId,
          parentId: payload.parentId,
          title: payload.title,
          durationMins: payload.durationMins,
        }),
      ),
    onMutate: async (payload) => {
      const queryKey = dailyPlanQueryKey(payload);
      await queryClient.cancelQueries({ queryKey, exact: true });
      const previous = queryClient.getQueryData<DailyPlan>(queryKey);
      const tempId = `temp-${Date.now()}`;
      const tempTask: Task = {
        id: tempId,
        plan_id: payload.planId,
        parent_id: payload.parentId,
        title: payload.title,
        description: null,
        duration_mins: payload.durationMins,
        is_completed: false,
        modification_state: "UNCHANGED",
      };

      queryClient.setQueryData<DailyPlan>(queryKey, (plan) =>
        updatePlanTasks(plan, (tasks) => [...tasks, tempTask]),
      );

      return { previous, tempId } satisfies AddTaskContext;
    },
    onError: (_error, payload, context) => {
      if (context?.previous) {
        queryClient.setQueryData(dailyPlanQueryKey(payload), context.previous);
      }
    },
    onSuccess: (task, payload, context) => {
      const queryKey = dailyPlanQueryKey(payload);
      queryClient.setQueryData<DailyPlan>(queryKey, (plan) =>
        updatePlanTasks(plan, (tasks) =>
          tasks.map((item) => (item.id === context.tempId ? task : item)),
        ),
      );
    },
  });

  const saveNote = useMutation({
    mutationFn: async (payload: SaveNotePayload) =>
      throwOnApiError(await saveEndDayNote(payload.userId, payload.date, payload.userNote)),
    onSuccess: (_result, payload) => {
      const queryKey = dailyPlanQueryKey(payload);
      queryClient.setQueryData<DailyPlan>(queryKey, (plan) =>
        plan ? { ...plan, user_note: payload.userNote } : plan,
      );
    },
  });

  const saveFocusTime = useMutation({
    mutationFn: async (payload: SaveFocusTimePayload) =>
      throwOnApiError(await saveTaskFocusTime(payload.taskId, payload.elapsedSeconds)),
    onSuccess: (_result, payload) => {
      const queryKey = dailyPlanQueryKey(payload);
      queryClient.setQueryData<DailyPlan>(queryKey, (plan) =>
        updatePlanTasks(plan, (tasks) =>
          replaceTask(tasks, payload.taskId, (task) => ({
            ...task,
            focus_time_seconds: payload.elapsedSeconds,
          })),
        ),
      );
    },
  });

  return {
    toggleTask,
    updateTaskTitle,
    updateTaskDuration,
    deleteTask: deleteTaskMutation,
    addTask,
    saveNote,
    saveFocusTime,
  };
}
