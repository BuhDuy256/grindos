import fs from "fs";
import path from "path";
import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest";
import type { Db } from "mongodb";
import type { DailyPlanDocument } from "@/modules/daily-plan/type";

function loadEnvFileIfPresent(filePath: string) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, equalsIndex).trim();
    const value = trimmed.slice(equalsIndex + 1).trim().replace(/^["']|["']$/g, "");
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnvFileIfPresent(path.resolve(process.cwd(), ".env"));
loadEnvFileIfPresent(path.resolve(process.cwd(), "..", ".env"));

const testUri = process.env.MONGODB_TEST_URI || process.env.MONGODB_URI;
const testDbName = `go_${Date.now().toString(36)}_${Math.random()
  .toString(16)
  .slice(2, 8)}`;

describe.skipIf(!testUri)("Mongo database CRUD", () => {
  let db: Db;
  let closeMongoClient: () => Promise<void>;
  let userRepo: import("@/modules/users/mongo.repository").UserMongoRepository;
  let statsRepo: import("@/modules/player-stats/mongo.repository").PlayerStatsMongoRepository;
  let planRepo: import("@/modules/daily-plan/mongo.repository").DailyPlanMongoRepository;

  async function cleanCollections() {
    await Promise.all([
      db.collection("users").deleteMany({}),
      db.collection("ai_contexts").deleteMany({}),
      db.collection("player_stats").deleteMany({}),
      db.collection("daily_plans").deleteMany({}),
      db.collection("tasks").deleteMany({}),
      db.collection("counters").deleteMany({}),
    ]);
  }

  beforeAll(async () => {
    process.env.MONGODB_URI = testUri;
    process.env.MONGODB_DB_NAME = testDbName;

    const mongo = await import("@/lib/mongodb");
    const users = await import("@/modules/users/mongo.repository");
    const playerStats = await import("@/modules/player-stats/mongo.repository");
    const dailyPlan = await import("@/modules/daily-plan/mongo.repository");

    db = await mongo.getMongoDb();
    closeMongoClient = mongo.closeMongoClient;
    userRepo = new users.UserMongoRepository();
    statsRepo = new playerStats.PlayerStatsMongoRepository();
    planRepo = new dailyPlan.DailyPlanMongoRepository();

    await db.command({ ping: 1 });
    await db.dropDatabase();
  });

  afterEach(async () => {
    await cleanCollections();
  });

  afterAll(async () => {
    if (db) {
      await db.dropDatabase();
    }
    if (closeMongoClient) {
      await closeMongoClient();
    }
  });

  test("creates, reads, lists, and upserts user records", async () => {
    const user = await userRepo.create({
      username: "ada",
      timezone: "Asia/Bangkok",
      passwordHash: "hashed-password",
    });

    expect(user).toMatchObject({
      id: 1,
      username: "ada",
      timezone: "Asia/Bangkok",
      isAdmin: false,
      schemaVersion: 1,
    });

    await expect(
      userRepo.create({
        username: "ada",
        timezone: "Asia/Bangkok",
        passwordHash: "other-hash",
      }),
    ).rejects.toThrow();

    await expect(userRepo.findById(user.id)).resolves.toMatchObject({
      username: "ada",
    });
    await expect(userRepo.findByUsername("ada")).resolves.toMatchObject({
      id: user.id,
    });
    await expect(userRepo.list()).resolves.toHaveLength(1);
    await expect(userRepo.hasAiContext(user.id)).resolves.toBe(false);

    const context = await userRepo.upsertAiContext(user.id, {
      mainGoal: "Ship GrindOS",
      metadata: { current_arc: { arc_id: 1, arc_name: "Arc I" } },
    });

    expect(context).toMatchObject({
      userId: user.id,
      mainGoal: "Ship GrindOS",
      schemaVersion: 1,
    });
    await expect(userRepo.hasAiContext(user.id)).resolves.toBe(true);

    const updatedContext = await userRepo.upsertAiContext(user.id, {
      mainGoal: "Ship GrindOS v2",
      metadata: { current_arc: { arc_id: 2, arc_name: "Arc II" } },
    });

    expect(updatedContext.mainGoal).toBe("Ship GrindOS v2");
    expect(updatedContext.metadata).toMatchObject({
      current_arc: { arc_id: 2 },
    });
  });

  test("creates, reads, and resets player stats", async () => {
    const stats = await statsRepo.createDefault(10);

    expect(stats).toMatchObject({
      userId: 10,
      level: 1,
      exp: 0,
      strStat: 10,
      intStat: 10,
      vitStat: 10,
      streak: 0,
      difficultyMultiplier: 1,
      schemaVersion: 1,
    });

    await db.collection("player_stats").updateOne(
      { userId: 10 },
      {
        $set: {
          level: 7,
          exp: 450,
          strStat: 18,
          intStat: 17,
          vitStat: 16,
          streak: 5,
          difficultyMultiplier: 1.35,
        },
      },
    );

    await expect(statsRepo.findByUserId(10)).resolves.toMatchObject({
      level: 7,
      exp: 450,
    });
    await expect(statsRepo.resetForUser(10)).resolves.toBe(true);
    await expect(statsRepo.findByUserId(10)).resolves.toMatchObject({
      level: 1,
      exp: 0,
      strStat: 10,
      intStat: 10,
      vitStat: 10,
      streak: 0,
      difficultyMultiplier: 1,
    });
    await expect(statsRepo.resetForUser(999)).resolves.toBe(false);
  });

  test("creates, reads, updates, soft-deletes, and resets daily plan tasks", async () => {
    const now = new Date();
    const plans: DailyPlanDocument[] = [
      {
        id: 1,
        userId: 20,
        date: "2026-06-04",
        progressAnalysis: null,
        systemMessage: "Start the day.",
        ecrScore: null,
        userNote: null,
        learningSummary: null,
        aiInsight: null,
        schemaVersion: 1,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      },
      {
        id: 2,
        userId: 20,
        date: "2026-06-03",
        progressAnalysis: null,
        systemMessage: null,
        ecrScore: 80,
        userNote: "Solid.",
        learningSummary: "Stable day.",
        aiInsight: null,
        schemaVersion: 1,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      },
      {
        id: 3,
        userId: 20,
        date: "2026-06-02",
        progressAnalysis: null,
        systemMessage: null,
        ecrScore: 60,
        userNote: "Hard.",
        learningSummary: "Needs recovery.",
        aiInsight: null,
        schemaVersion: 1,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      },
    ];

    await db.collection<DailyPlanDocument>("daily_plans").insertMany(plans);

    const rootTask = await planRepo.createTask({
      planId: 1,
      parentId: null,
      title: "Deep work",
      durationMins: 45,
    });
    const childTask = await planRepo.createTask({
      planId: 1,
      parentId: rootTask.id,
      title: "Review notes",
      durationMins: 15,
    });

    await expect(planRepo.findPlanByUserAndDate(20, "2026-06-04")).resolves.toMatchObject({
      id: 1,
      userId: 20,
    });
    await expect(planRepo.findTasksByPlanId(1)).resolves.toHaveLength(2);

    await expect(planRepo.toggleTaskComplete(rootTask.id)).resolves.toBe(true);
    await expect(planRepo.findTaskById(rootTask.id)).resolves.toMatchObject({
      isCompleted: true,
    });

    await expect(
      planRepo.updateTask(childTask.id, {
        title: "Review notes carefully",
        durationMins: 20,
      }),
    ).resolves.toBe(true);
    await expect(planRepo.findTaskById(childTask.id)).resolves.toMatchObject({
      title: "Review notes carefully",
      durationMins: 20,
      modificationState: "EDITED",
    });

    await expect(planRepo.softDeleteTask(childTask.id)).resolves.toBe(true);
    await expect(planRepo.findTaskById(childTask.id)).resolves.toBeNull();
    await expect(planRepo.findTasksByPlanId(1)).resolves.toHaveLength(1);

    await expect(
      planRepo.updateUserNote(20, "2026-06-04", "Finished strong."),
    ).resolves.toBe(true);
    await expect(planRepo.findPlanById(1)).resolves.toMatchObject({
      userNote: "Finished strong.",
    });

    await expect(planRepo.getEcrHistory(20, 2)).resolves.toMatchObject([
      { date: "2026-06-02", ecrScore: 60 },
      { date: "2026-06-03", ecrScore: 80 },
    ]);

    await planRepo.resetUserPlans(20);
    await expect(planRepo.findPlanById(1)).resolves.toBeNull();
    await expect(planRepo.findTasksByPlanId(1)).resolves.toHaveLength(0);
  });
});
