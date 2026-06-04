import { getMongoDb } from "@/lib/mongodb";
import { nextSequence } from "@/modules/shared/sequence.mongo.repository";
import type {
  DailyPlanRepository,
  CreatePlanInput,
  CreateTaskInput,
  UpdateTaskInput,
} from "./repository";
import type { DailyPlanDocument, TaskDocument } from "./type";

const DAILY_PLANS_COLLECTION = "daily_plans";
const TASKS_COLLECTION = "tasks";

let indexesReady = false;

async function ensureIndexes() {
  if (indexesReady) {
    return;
  }

  const db = await getMongoDb();
  await Promise.all([
    db.collection<DailyPlanDocument>(DAILY_PLANS_COLLECTION).createIndex(
      { id: 1 },
      { unique: true },
    ),
    db.collection<DailyPlanDocument>(DAILY_PLANS_COLLECTION).createIndex(
      { userId: 1, date: 1 },
      { unique: true },
    ),
    db.collection<DailyPlanDocument>(DAILY_PLANS_COLLECTION).createIndex(
      { userId: 1, ecrScore: 1, date: -1 },
    ),
    db.collection<TaskDocument>(TASKS_COLLECTION).createIndex(
      { id: 1 },
      { unique: true },
    ),
    db.collection<TaskDocument>(TASKS_COLLECTION).createIndex(
      { dailyPlanId: 1, parentId: 1 },
    ),
  ]);
  indexesReady = true;
}

async function plansCollection() {
  await ensureIndexes();
  return (await getMongoDb()).collection<DailyPlanDocument>(DAILY_PLANS_COLLECTION);
}

async function tasksCollection() {
  await ensureIndexes();
  return (await getMongoDb()).collection<TaskDocument>(TASKS_COLLECTION);
}

function visiblePlanFilter(extra: Record<string, unknown>) {
  return { ...extra, deletedAt: null };
}

function visibleTaskFilter(extra: Record<string, unknown>) {
  return { ...extra, deletedAt: null, modificationState: { $ne: "DELETED" as const } };
}

export class DailyPlanMongoRepository implements DailyPlanRepository {
  async findPlanByUserAndDate(userId: number, date: string) {
    return (await plansCollection()).findOne(visiblePlanFilter({ userId, date }));
  }

  async findPlanById(planId: number) {
    return (await plansCollection()).findOne(visiblePlanFilter({ id: planId }));
  }

  async createPlan(input: CreatePlanInput) {
    const now = new Date();
    const plan: DailyPlanDocument = {
      id: await nextSequence("daily_plans"),
      userId: input.userId,
      date: input.date,
      progressAnalysis: null,
      systemMessage: null,
      ecrScore: null,
      userNote: null,
      learningSummary: null,
      aiInsight: null,
      schemaVersion: 1,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };

    await (await plansCollection()).insertOne(plan);
    return plan;
  }

  async findTasksByPlanId(planId: number) {
    return (await tasksCollection())
      .find(visibleTaskFilter({ dailyPlanId: planId }), { sort: { id: 1 } })
      .toArray();
  }

  async findTaskById(taskId: number) {
    return (await tasksCollection()).findOne(visibleTaskFilter({ id: taskId }));
  }

  async createTask(input: CreateTaskInput) {
    const now = new Date();
    const task: TaskDocument = {
      id: await nextSequence("tasks"),
      dailyPlanId: input.planId,
      parentId: input.parentId,
      title: input.title,
      description: null,
      durationMins: input.durationMins,
      isCompleted: false,
      originType: "USER_CREATED",
      modificationState: "UNCHANGED",
      schemaVersion: 1,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };

    await (await tasksCollection()).insertOne(task);
    return task;
  }

  async toggleTaskComplete(taskId: number) {
    const tasks = await tasksCollection();
    const task = await tasks.findOne(visibleTaskFilter({ id: taskId }));
    if (!task) {
      return null;
    }

    const nextState = !task.isCompleted;
    await tasks.updateOne(
      { id: taskId },
      { $set: { isCompleted: nextState, updatedAt: new Date() } },
    );
    return nextState;
  }

  async updateTask(taskId: number, input: UpdateTaskInput) {
    const $set: Partial<TaskDocument> = {
      modificationState: "EDITED",
      updatedAt: new Date(),
    };

    if (input.title !== undefined) {
      $set.title = input.title;
    }

    if (input.durationMins !== undefined) {
      $set.durationMins = input.durationMins;
    }

    const result = await (await tasksCollection()).updateOne(
      visibleTaskFilter({ id: taskId }),
      { $set },
    );

    return result.matchedCount > 0;
  }

  async softDeleteTask(taskId: number) {
    const result = await (await tasksCollection()).updateOne(
      visibleTaskFilter({ id: taskId }),
      {
        $set: {
          modificationState: "DELETED",
          deletedAt: new Date(),
          updatedAt: new Date(),
        },
      },
    );

    return result.matchedCount > 0;
  }

  async updateUserNote(userId: number, date: string, userNote: string) {
    const result = await (await plansCollection()).updateOne(
      visiblePlanFilter({ userId, date }),
      { $set: { userNote, updatedAt: new Date() } },
    );

    return result.matchedCount > 0;
  }

  async getEcrHistory(userId: number, days: number) {
    const plans = await (await plansCollection())
      .find(
        {
          userId,
          deletedAt: null,
          ecrScore: { $ne: null },
        },
        { sort: { date: -1 }, limit: days },
      )
      .toArray();

    return plans.reverse();
  }

  async resetUserPlans(userId: number) {
    const now = new Date();
    const plans = await (await plansCollection())
      .find(visiblePlanFilter({ userId }), { projection: { id: 1 } })
      .toArray();
    const planIds = plans.map((plan) => plan.id);

    await (await plansCollection()).updateMany(
      visiblePlanFilter({ userId }),
      { $set: { deletedAt: now, updatedAt: now } },
    );

    if (planIds.length > 0) {
      await (await tasksCollection()).updateMany(
        {
          dailyPlanId: { $in: planIds },
          deletedAt: null,
        },
        {
          $set: {
            modificationState: "DELETED",
            deletedAt: now,
            updatedAt: now,
          },
        },
      );
    }
  }
}

export const dailyPlanRepository = new DailyPlanMongoRepository();
